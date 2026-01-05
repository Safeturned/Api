using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Clients.FileChecker;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/files/upload")]
[ApiController]
[ApiSecurityFilter]
public class ChunkedFilesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IChunkStorageService _chunkStorageService;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    public ChunkedFilesController(
        IServiceScopeFactory serviceScopeFactory,
        IChunkStorageService chunkStorageService,
        IFileCheckingService fileCheckingService,
        IAnalyticsService analyticsService,
        ILogger logger,
        IConfiguration configuration)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _chunkStorageService = chunkStorageService;
        _fileCheckingService = fileCheckingService;
        _analyticsService = analyticsService;
        _logger = logger.ForContext<ChunkedFilesController>();
        _configuration = configuration;
    }

    [HttpPost("initiate")]
    public async Task<IActionResult> InitiateUpload([FromBody] InitiateUploadRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.FileName))
            return BadRequest("FileName is required.");

        if (request.FileSizeBytes <= 0)
            return BadRequest("FileSizeBytes must be greater than 0.");

        var maxFileSizeBytes = _configuration.GetValue<long>("UploadLimits:MaxFileSizeBytes");
        var maxChunksPerSession = _configuration.GetValue<int>("UploadLimits:MaxChunksPerSession");

        if (request.FileSizeBytes > maxFileSizeBytes)
            return BadRequest($"File size exceeds maximum allowed size of {maxFileSizeBytes / (1024 * 1024)}MB.");

        if (request.TotalChunks <= 0)
            return BadRequest("TotalChunks must be greater than 0.");

        if (request.TotalChunks > maxChunksPerSession)
            return BadRequest($"Total chunks exceeds maximum allowed chunks of {maxChunksPerSession}.");

        if (string.IsNullOrEmpty(request.FileHash))
            return BadRequest("FileHash is required.");

        if (!string.Equals(Path.GetExtension(request.FileName), FileConstants.AllowedExtension, StringComparison.OrdinalIgnoreCase))
            return BadRequest(FileConstants.ErrorMessageInvalidExtension);

        try
        {
            var clientIp = HttpContext.GetIPAddress();
            var sessionId = await _chunkStorageService.InitiateUploadSessionAsync(
                request.FileName,
                request.FileSizeBytes,
                request.FileHash,
                request.TotalChunks,
                clientIp,
                cancellationToken);

            _logger.Information("Initiated upload session {SessionId} for file {FileName}", sessionId, request.FileName);

            return Ok(new InitiateUploadResponse(sessionId, "Upload session initiated successfully"));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error initiating upload session for file {FileName}", request.FileName);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error initiating upload session"));
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("chunk")]
    public async Task<IActionResult> UploadChunk([FromForm] UploadChunkRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.SessionId))
            return BadRequest("SessionId is required.");

        if (request.ChunkIndex < 0)
            return BadRequest("ChunkIndex must be non-negative.");

        if (request.Chunk == null || request.Chunk.Length == 0)
            return BadRequest("Chunk data is required.");

        if (string.IsNullOrEmpty(request.ChunkHash))
            return BadRequest("ChunkHash is required.");

        try
        {
            var clientIp = HttpContext.GetIPAddress();
            var session = await _chunkStorageService.GetSessionAsync(request.SessionId, cancellationToken);
            if (session == null)
            {
                _logger.Warning("Session {SessionId} not found for chunk upload", request.SessionId);
                return NotFound("Upload session not found or expired.");
            }

            if (!string.Equals(session.ClientIpAddress, clientIp, StringComparison.OrdinalIgnoreCase))
            {
                _logger.Warning("IP address mismatch for session {SessionId}. Expected: {ExpectedIp}, Actual: {ActualIp}",
                    request.SessionId, session.ClientIpAddress, clientIp);
                return BadRequest("Invalid session access.");
            }

            if (request.ChunkIndex >= session.TotalChunks)
            {
                return BadRequest("ChunkIndex exceeds total chunks for this session.");
            }

            if (await _chunkStorageService.IsChunkUploadedAsync(request.SessionId, request.ChunkIndex, cancellationToken))
            {
                _logger.Debug("Chunk {ChunkIndex} already uploaded for session {SessionId}", request.ChunkIndex, request.SessionId);
                return Ok(new UploadChunkResponse(true, "Chunk already uploaded"));
            }

            var success = await _chunkStorageService.StoreChunkAsync(
                request.SessionId,
                request.ChunkIndex,
                request.Chunk,
                request.ChunkHash,
                cancellationToken);

            if (!success)
            {
                _logger.Warning("Failed to store chunk {ChunkIndex} for session {SessionId}", request.ChunkIndex, request.SessionId);
                return BadRequest("Failed to store chunk. Please retry.");
            }

            _logger.Debug("Stored chunk {ChunkIndex} for session {SessionId}", request.ChunkIndex, request.SessionId);

            return Ok(new UploadChunkResponse(true, "Chunk uploaded successfully"));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error uploading chunk {ChunkIndex} for session {SessionId}", request.ChunkIndex, request.SessionId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error uploading chunk"));
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteUpload([FromBody] CompleteUploadRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.SessionId))
            return BadRequest("SessionId is required.");

        try
        {
            var session = await _chunkStorageService.GetSessionAsync(request.SessionId, cancellationToken);
            if (session == null)
            {
                _logger.Warning("Session {SessionId} not found for completion", request.SessionId);
                return NotFound("Upload session not found or expired.");
            }

            var completed = await _chunkStorageService.CompleteUploadAsync(request.SessionId, cancellationToken);
            if (!completed)
            {
                return BadRequest("Not all chunks have been uploaded.");
            }

            var finalFilePath = await _chunkStorageService.AssembleFileAsync(request.SessionId, cancellationToken);
            if (string.IsNullOrEmpty(finalFilePath))
            {
                _logger.Error("Failed to assemble file for session {SessionId}", request.SessionId);
                return StatusCode(500, "Failed to assemble file.");
            }
            var scanStartTime = DateTime.UtcNow;
            var fileInfo = new FileInfo(finalFilePath);

            bool canProcess;
            await using (var stream = new FileStream(finalFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                canProcess = await _fileCheckingService.CanProcessFileAsync(stream, cancellationToken);
            }

            if (!canProcess)
            {
                _logger.Warning("Assembled file for session {SessionId} is not a valid .NET assembly", request.SessionId);
                await _chunkStorageService.CleanupSessionAsync(request.SessionId, cancellationToken);
                return Ok(new FileCheckResponse(
                    session.FileName,
                    session.FileHash,
                    0,
                    false,
                    ResponseMessageType.FileNotDotNetAssembly,
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    session.FileSizeBytes,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                ));
            }
            FileCheckResult processingContext;
            await using (var stream = new FileStream(finalFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                processingContext = await _fileCheckingService.CheckFileAsync(stream, cancellationToken);
            }

            var metadata = processingContext.Metadata;

            var (userId, apiKeyId) = HttpContext.GetUserContext();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            Guid? validUserId = null;
            if (userId.HasValue)
            {
                var userExists = await filesDb.Set<User>().AnyAsync(u => u.Id == userId.Value, cancellationToken);
                if (userExists)
                {
                    validUserId = userId;
                }
                else
                {
                    _logger.Warning("User {UserId} from token does not exist in database, skipping user association", userId.Value);
                }
            }

            var existingFile = await filesDb.Set<FileData>().FirstOrDefaultAsync(x => x.Hash == session.FileHash, cancellationToken);

            if (existingFile == null)
            {
                var fileData = new FileData
                {
                    Hash = session.FileHash,
                    Score = (int)processingContext.Score,
                    FileName = session.FileName,
                    SizeBytes = session.FileSizeBytes,
                    DetectedType = "Assembly",
                    AddDateTime = DateTime.UtcNow,
                    LastScanned = DateTime.UtcNow,
                    TimesScanned = 1,
                    UserId = validUserId,
                    ApiKeyId = apiKeyId,
                    AnalyzerVersion = processingContext.Version,
                    AssemblyCompany = metadata?.Company,
                    AssemblyProduct = metadata?.Product,
                    AssemblyTitle = metadata?.Title,
                    AssemblyGuid = metadata?.Guid,
                    AssemblyCopyright = metadata?.Copyright
                };

                await filesDb.Set<FileData>().AddAsync(fileData, cancellationToken);
                await filesDb.SaveChangesAsync(cancellationToken);

                if (!string.IsNullOrEmpty(request.BadgeToken) && validUserId.HasValue)
                {
                    var badges = await filesDb.Set<Badge>()
                        .Where(b => b.UserId == validUserId.Value && b.RequireTokenForUpdate == true && b.UpdateToken != null)
                        .ToListAsync(cancellationToken);

                    foreach (var badge in badges)
                    {
                        if (BadgeTokenHelper.VerifyToken(request.BadgeToken, badge.UpdateToken!, badge.UpdateSalt))
                        {
                            _logger.Information("Badge {BadgeId} auto-updating via token to hash {Hash}",
                                badge.Id, fileData.Hash);
                            badge.LinkedFileHash = fileData.Hash;
                            badge.UpdatedAt = DateTime.UtcNow;
                            badge.VersionUpdateCount++;
                        }
                    }

                    if (badges.Any())
                    {
                        await filesDb.SaveChangesAsync(cancellationToken);
                    }
                }
            }
            else
            {
                existingFile.Score = (int)processingContext.Score;
                existingFile.FileName = session.FileName;
                existingFile.SizeBytes = session.FileSizeBytes;
                existingFile.LastScanned = DateTime.UtcNow;
                existingFile.TimesScanned++;
                existingFile.AnalyzerVersion = processingContext.Version;
                existingFile.AssemblyCompany = metadata?.Company;
                existingFile.AssemblyProduct = metadata?.Product;
                existingFile.AssemblyTitle = metadata?.Title;
                existingFile.AssemblyGuid = metadata?.Guid;
                existingFile.AssemblyCopyright = metadata?.Copyright;
                if (validUserId.HasValue && !existingFile.UserId.HasValue)
                {
                    existingFile.UserId = validUserId;
                    existingFile.ApiKeyId = apiKeyId;
                }

                await filesDb.SaveChangesAsync(cancellationToken);

                if (!string.IsNullOrEmpty(request.BadgeToken) && validUserId.HasValue)
                {
                    var badges = await filesDb.Set<Badge>()
                        .Where(b => b.UserId == validUserId.Value && b.RequireTokenForUpdate == true && b.UpdateToken != null)
                        .ToListAsync(cancellationToken);

                    foreach (var badge in badges)
                    {
                        if (BadgeTokenHelper.VerifyToken(request.BadgeToken, badge.UpdateToken!, badge.UpdateSalt))
                        {
                            _logger.Information("Badge {BadgeId} auto-updating via token to hash {Hash}",
                                badge.Id, existingFile.Hash);
                            badge.LinkedFileHash = existingFile.Hash;
                            badge.UpdatedAt = DateTime.UtcNow;
                            badge.VersionUpdateCount++;
                        }
                    }

                    if (badges.Any())
                    {
                        await filesDb.SaveChangesAsync(cancellationToken);
                    }
                }
            }

            var scanTime = DateTime.UtcNow - scanStartTime;
            var isThreat = processingContext.Score >= 50;

            await _analyticsService.RecordScanAsync(session.FileName, session.FileHash, processingContext.Score, isThreat, scanTime, validUserId, apiKeyId, cancellationToken);

            _logger.Information("File processing completed for session {SessionId}. Score: {Score}, Time: {ScanTime}ms", request.SessionId, processingContext.Score, scanTime.TotalMilliseconds);

            await _chunkStorageService.CleanupSessionAsync(request.SessionId, cancellationToken);

            return Ok(new FileCheckResponse(
                session.FileName,
                session.FileHash,
                processingContext.Score,
                true,
                ResponseMessageType.NewFileProcessedSuccessfully,
                DateTime.UtcNow,
                DateTime.UtcNow,
                session.FileSizeBytes,
                processingContext.Version,
                null,
                metadata?.Company,
                metadata?.Product,
                metadata?.Title,
                metadata?.Guid,
                metadata?.Copyright
            ));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error completing upload for session {SessionId}", request.SessionId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error completing upload"));
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("status/{sessionId}")]
    public async Task<IActionResult> GetUploadStatus(string sessionId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(sessionId))
            return BadRequest("SessionId is required.");

        try
        {
            var session = await _chunkStorageService.GetSessionAsync(sessionId);
            if (session == null)
            {
                return NotFound("Upload session not found or expired.");
            }

            var clientIp = Request.HttpContext.GetIPAddress();
            if (session.ClientIpAddress != clientIp)
            {
                _logger.Warning("IP address mismatch for session {SessionId}. Expected: {ExpectedIp}, Actual: {ActualIp}",
                    sessionId, session.ClientIpAddress, clientIp);
                return StatusCode(403, "Access denied: IP address mismatch");
            }

            var uploadedChunks = session.UploadedChunks.Count(chunk => chunk);
            var progress = (double)uploadedChunks / session.TotalChunks * Constants.RateLimitConstants.PercentageMultiplier;

            return Ok(new UploadStatusResponse(sessionId, session.FileName, session.TotalChunks, uploadedChunks, Math.Round(progress, Constants.RateLimitConstants.DecimalPlacesForRounding), session.IsCompleted, session.ExpiresAt));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error getting upload status for session {SessionId}", sessionId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error getting upload status"));
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("cancel/{sessionId}")]
    public async Task<IActionResult> CancelUpload(string sessionId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(sessionId))
            return BadRequest("SessionId is required.");

        try
        {
            var session = await _chunkStorageService.GetSessionAsync(sessionId, cancellationToken);
            if (session == null)
            {
                return NotFound("Upload session not found or expired.");
            }

            var clientIp = Request.HttpContext.GetIPAddress();
            if (session.ClientIpAddress != clientIp)
            {
                _logger.Warning("IP address mismatch for cancel request on session {SessionId}. Expected: {ExpectedIp}, Actual: {ActualIp}",
                    sessionId, session.ClientIpAddress, clientIp);
                return StatusCode(403, "Access denied: IP address mismatch");
            }

            await _chunkStorageService.CleanupSessionAsync(sessionId, cancellationToken);
            _logger.Information("Cancelled upload session {SessionId}", sessionId);

            return Ok(new { Message = "Upload cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error cancelling upload session {SessionId}", sessionId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error cancelling upload session"));
            return StatusCode(500, "Internal server error");
        }
    }
}