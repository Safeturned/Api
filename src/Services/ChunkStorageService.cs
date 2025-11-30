using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Services;

public class ChunkStorageService : IChunkStorageService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;
    private readonly string _chunksDirectory;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> SessionLocks = new();

    public ChunkStorageService(IServiceScopeFactory serviceScopeFactory, ILogger logger, IConfiguration configuration)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _configuration = configuration;
        _logger = logger.ForContext<ChunkStorageService>();
        var directoryPath = _configuration.GetRequiredString("ChunkStorage:DirectoryPath");
        _chunksDirectory = directoryPath;
        Directory.CreateDirectory(_chunksDirectory);
    }

    public async Task<string> InitiateUploadSessionAsync(string fileName, long fileSizeBytes, string fileHash, int totalChunks, string clientIpAddress, CancellationToken cancellationToken = default)
    {
        var sessionId = Guid.NewGuid().ToString();
        var sessionDirectory = Path.Combine(_chunksDirectory, sessionId);
        Directory.CreateDirectory(sessionDirectory);

        var session = new ChunkUploadSession
        {
            SessionId = sessionId,
            FileName = fileName,
            FileSizeBytes = fileSizeBytes,
            FileHash = fileHash,
            TotalChunks = totalChunks,
            UploadedChunks = new bool[totalChunks],
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(_configuration.GetValue<int>("UploadLimits:SessionExpirationHours")),
            ClientIpAddress = clientIpAddress,
            IsCompleted = false
        };

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        await dbContext.Set<ChunkUploadSession>().AddAsync(session, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        _logger.Information("Created upload session {SessionId} for file {FileName} with {TotalChunks} chunks",
            sessionId, fileName, totalChunks);

        return sessionId;
    }

    public async Task<bool> StoreChunkAsync(string sessionId, int chunkIndex, IFormFile chunkFile, string chunkHash, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(sessionId, out _))
        {
            _logger.Warning("Invalid sessionId format: {SessionId}", sessionId);
            return false;
        }

        var sessionLock = SessionLocks.GetOrAdd(sessionId, _ => new SemaphoreSlim(1, 1));

        bool lockAcquired = false;
        try
        {
            await sessionLock.WaitAsync(cancellationToken);
            lockAcquired = true;

            var session = await GetSessionAsync(sessionId, cancellationToken);
            if (session == null)
            {
                _logger.Warning("Session {SessionId} not found for chunk {ChunkIndex}", sessionId, chunkIndex);
                return false;
            }

            if (chunkIndex >= session.TotalChunks)
            {
                _logger.Warning("Chunk index {ChunkIndex} out of range for session {SessionId}", chunkIndex, sessionId);
                return false;
            }

            var sessionDirectory = Path.Combine(_chunksDirectory, sessionId);
            var chunkFilePath = Path.Combine(sessionDirectory, string.Format(ChunkStorageConstants.ChunkFileNameFormat, chunkIndex));

            await using (var fileStream = new FileStream(chunkFilePath, FileMode.Create, FileAccess.Write, FileShare.None, _configuration.GetValue<int>("UploadLimits:FileBufferSize"), FileOptions.SequentialScan))
            {
                await using var inputStream = chunkFile.OpenReadStream();
                await inputStream.CopyToAsync(fileStream, cancellationToken);
                await fileStream.FlushAsync(cancellationToken);
            }

            await Task.Delay(ChunkStorageConstants.FileSystemSettleDelayMs, cancellationToken);
            var computedHash = await HashHelper.ComputeFileHashWithRetryAsync(chunkFilePath, cancellationToken);
            if (!string.Equals(computedHash, chunkHash, StringComparison.OrdinalIgnoreCase))
            {
                _logger.Warning("Chunk hash mismatch for session {SessionId}, chunk {ChunkIndex}", sessionId, chunkIndex);
                File.Delete(chunkFilePath);
                return false;
            }

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var dbSession = await dbContext.Set<ChunkUploadSession>().FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

            if (dbSession != null)
            {
                dbSession.UploadedChunks[chunkIndex] = true;
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            _logger.Debug("Stored chunk {ChunkIndex} for session {SessionId}", chunkIndex, sessionId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error storing chunk {ChunkIndex} for session {SessionId}", chunkIndex, sessionId);
            return false;
        }
        finally
        {
            if (lockAcquired)
            {
                sessionLock.Release();

                if (await IsSessionCompletedOrExpiredAsync(sessionId, cancellationToken))
                {
                    SessionLocks.TryRemove(sessionId, out var lockToDispose);
                    lockToDispose?.Dispose();
                }
            }
        }
    }

    public async Task<bool> IsChunkUploadedAsync(string sessionId, int chunkIndex, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionAsync(sessionId, cancellationToken);
        return session != null && chunkIndex < session.UploadedChunks.Length && session.UploadedChunks[chunkIndex];
    }

    public async Task<ChunkUploadSession?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            return await dbContext.Set<ChunkUploadSession>().FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<bool> CompleteUploadAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var sessionLock = SessionLocks.GetOrAdd(sessionId, _ => new SemaphoreSlim(1, 1));

        bool lockAcquired = false;
        try
        {
            await sessionLock.WaitAsync(cancellationToken);
            lockAcquired = true;

            var session = await GetSessionAsync(sessionId, cancellationToken);
            if (session == null)
            {
                _logger.Warning("Session {SessionId} not found for completion", sessionId);
                return false;
            }

            if (session.IsCompleted)
            {
                _logger.Warning("Session {SessionId} already completed", sessionId);
                return true;
            }

            if (session.UploadedChunks.Any(chunk => !chunk))
            {
                _logger.Warning("Not all chunks uploaded for session {SessionId}", sessionId);
                return false;
            }
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var dbSession = await dbContext.Set<ChunkUploadSession>().FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

            if (dbSession != null)
            {
                dbSession.IsCompleted = true;
                dbSession.CompletedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            _logger.Information("Upload completed for session {SessionId}", sessionId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error completing upload for session {SessionId}", sessionId);
            return false;
        }
        finally
        {
            if (lockAcquired)
            {
                sessionLock.Release();
            }
        }
    }

    public async Task<string?> AssembleFileAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(sessionId, out _))
        {
            _logger.Warning("Invalid sessionId format: {SessionId}", sessionId);
            return null;
        }

        var sessionLock = SessionLocks.GetOrAdd(sessionId, _ => new SemaphoreSlim(1, 1));

        bool lockAcquired = false;
        try
        {
            await sessionLock.WaitAsync(cancellationToken);
            lockAcquired = true;

            var session = await GetSessionAsync(sessionId, cancellationToken);
            if (session == null)
            {
                _logger.Warning("Session {SessionId} not found for assembly", sessionId);
                return null;
            }

            if (!session.IsCompleted)
            {
                _logger.Warning("Session {SessionId} not completed before assembly", sessionId);
                return null;
            }

            var sessionDirectory = Path.Combine(_chunksDirectory, sessionId);
            var finalFilePath = Path.Combine(sessionDirectory, ChunkStorageConstants.FinalFileName);

            if (File.Exists(finalFilePath))
            {
                _logger.Information("File already assembled for session {SessionId}, returning existing file", sessionId);
                return finalFilePath;
            }

            await using (var outputStream = new FileStream(finalFilePath, FileMode.Create, FileAccess.Write, FileShare.None, ChunkStorageConstants.DefaultFileBufferSize, FileOptions.SequentialScan))
            {
                for (int i = 0; i < session.TotalChunks; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var chunkFilePath = Path.Combine(sessionDirectory, string.Format(ChunkStorageConstants.ChunkFileNameFormat, i));

                    if (!File.Exists(chunkFilePath))
                    {
                        _logger.Warning("Chunk {ChunkIndex} not found for session {SessionId}", i, sessionId);
                        return null;
                    }

                    await using var chunkStream = new FileStream(chunkFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, ChunkStorageConstants.DefaultFileBufferSize, FileOptions.SequentialScan);
                    await chunkStream.CopyToAsync(outputStream, cancellationToken);
                }

                await outputStream.FlushAsync(cancellationToken);
            }

            await Task.Delay(ChunkStorageConstants.FileSystemSettleDelayMs, cancellationToken);
            var finalFileHash = await HashHelper.ComputeFileHashWithRetryAsync(finalFilePath, cancellationToken);
            if (!string.Equals(finalFileHash, session.FileHash, StringComparison.OrdinalIgnoreCase))
            {
                _logger.Warning("Final file hash mismatch for session {SessionId}", sessionId);
                File.Delete(finalFilePath);
                return null;
            }

            _logger.Information("File assembled successfully for session {SessionId}", sessionId);
            return finalFilePath;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error assembling file for session {SessionId}", sessionId);
            return null;
        }
        finally
        {
            if (lockAcquired)
            {
                sessionLock.Release();
            }
        }
    }

    public async Task CleanupSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        // Validate sessionId is a valid GUID to prevent path traversal attacks
        if (!Guid.TryParse(sessionId, out _))
        {
            _logger.Warning("Invalid sessionId format: {SessionId}", sessionId);
            return;
        }

        try
        {
            var sessionDirectory = Path.Combine(_chunksDirectory, sessionId);
            if (Directory.Exists(sessionDirectory))
            {
                Directory.Delete(sessionDirectory, true);
            }

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var session = await dbContext.Set<ChunkUploadSession>().FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

            if (session != null)
            {
                dbContext.Set<ChunkUploadSession>().Remove(session);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            _logger.Debug("Cleaned up session {SessionId}", sessionId);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error cleaning up session {SessionId}", sessionId);
        }
    }

    public async Task CleanupExpiredSessionsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var expiredSessions = new List<string>();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var expired = await dbContext.Set<ChunkUploadSession>()
                .Where(s => s.ExpiresAt < DateTime.UtcNow)
                .ToListAsync(cancellationToken);

            foreach (var session in expired)
            {
                cancellationToken.ThrowIfCancellationRequested();
                expiredSessions.Add(session.SessionId);
                await CleanupSessionAsync(session.SessionId, cancellationToken);
            }

            if (expiredSessions.Count > 0)
            {
                _logger.Information("Cleaned up {Count} expired sessions", expiredSessions.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error cleaning up expired sessions");
        }
    }

    public async Task<int> GetActiveSessionCountAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            return await dbContext.Set<ChunkUploadSession>()
                .CountAsync(x => x.ExpiresAt > DateTime.UtcNow && !x.IsCompleted, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error getting active session count");
            return 0;
        }
    }

    private async Task<bool> IsSessionCompletedOrExpiredAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            var session = await GetSessionAsync(sessionId, cancellationToken);
            return session == null || session.IsCompleted || session.ExpiresAt <= DateTime.UtcNow;
        }
        catch
        {
            return true; // Assume expired if we can't check
        }
    }
}
