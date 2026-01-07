using System.Text.Json;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Clients.FileChecker;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Jobs;
using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public class AnalysisJobService : IAnalysisJobService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IDistributedCache _cache;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    private const string JobCompletionKeyPrefix = "job:complete:";
    private const int DefaultJobExpirationHours = 24;
    private const int DefaultV1TimeoutSeconds = 30;

    public AnalysisJobService(
        IServiceScopeFactory serviceScopeFactory,
        IBackgroundJobClient backgroundJobClient,
        IDistributedCache cache,
        ILogger logger,
        IConfiguration configuration)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _backgroundJobClient = backgroundJobClient;
        _cache = cache;
        _logger = logger.ForContext<AnalysisJobService>();
        _configuration = configuration;
    }

    public async Task<AnalysisJob> CreateJobAsync(
        Stream fileStream,
        string fileName,
        long fileSize,
        Guid? userId,
        Guid? apiKeyId,
        string clientIpAddress,
        bool forceAnalyze,
        string? badgeToken,
        CancellationToken cancellationToken = default)
    {
        var fileHash = HashHelper.ComputeHash(fileStream);
        fileStream.Position = 0;

        var tempDirectory = _configuration.GetRequiredString("Analysis:TempFileDirectory");
        var jobId = Guid.NewGuid();
        var tempFilePath = Path.Combine(tempDirectory, $"analysis_{jobId}.dll");

        Directory.CreateDirectory(tempDirectory);

        await using (var tempFile = File.Create(tempFilePath))
        {
            await fileStream.CopyToAsync(tempFile, cancellationToken);
        }

        var expirationHours = _configuration.GetValue("Analysis:JobExpirationHours", DefaultJobExpirationHours);

        var job = new AnalysisJob
        {
            Id = jobId,
            Status = AnalysisJobStatus.Pending,
            FileName = fileName,
            FileHash = fileHash,
            FileSizeBytes = fileSize,
            UserId = userId,
            ApiKeyId = apiKeyId,
            ClientIpAddress = clientIpAddress,
            ForceAnalyze = forceAnalyze,
            BadgeToken = badgeToken,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(expirationHours),
            TempFilePath = tempFilePath,
            TempFileCleanedUp = false
        };

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        await filesDb.Set<AnalysisJob>().AddAsync(job, cancellationToken);
        await filesDb.SaveChangesAsync(cancellationToken);

        _logger.Information("Created analysis job {JobId} for file {FileName} (hash: {FileHash})",
            job.Id, fileName, fileHash);

        return job;
    }

    public Task EnqueueJobAsync(AnalysisJob job, CancellationToken cancellationToken = default)
    {
        var hangfireJobId = _backgroundJobClient.Enqueue<FileAnalysisJob>(
            x => x.ProcessAsync(job.Id, null!, CancellationToken.None));

        _logger.Information("Enqueued job {JobId} to Hangfire with ID {HangfireJobId}",
            job.Id, hangfireJobId);

        return Task.CompletedTask;
    }

    public async Task<AnalysisJob?> GetJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await filesDb.Set<AnalysisJob>()
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);
    }

    public async Task<AnalysisJob?> WaitForCompletionAsync(
        Guid jobId,
        TimeSpan timeout,
        CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;
        var pollInterval = TimeSpan.FromMilliseconds(100);
        var maxPollInterval = TimeSpan.FromSeconds(1);

        while (DateTime.UtcNow - startTime < timeout)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var cacheKey = $"{JobCompletionKeyPrefix}{jobId}";
            var cachedResult = await _cache.GetStringAsync(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                return await GetJobAsync(jobId, cancellationToken);
            }

            var job = await GetJobAsync(jobId, cancellationToken);
            if (job?.Status is AnalysisJobStatus.Completed or AnalysisJobStatus.Failed)
            {
                return job;
            }

            await Task.Delay(pollInterval, cancellationToken);
            pollInterval = TimeSpan.FromMilliseconds(
                Math.Min(pollInterval.TotalMilliseconds * 1.5, maxPollInterval.TotalMilliseconds));
        }

        return await GetJobAsync(jobId, cancellationToken);
    }

    public async Task ProcessJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var fileCheckingService = scope.ServiceProvider.GetRequiredService<IFileCheckingService>();
        var analyticsService = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

        var job = await filesDb.Set<AnalysisJob>()
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null)
        {
            _logger.Warning("Job {JobId} not found for processing", jobId);
            return;
        }

        if (job.Status != AnalysisJobStatus.Pending)
        {
            _logger.Warning("Job {JobId} is not in Pending status (current: {Status}), skipping",
                jobId, job.Status);
            return;
        }

        var scanStartTime = DateTime.UtcNow;

        try
        {
            job.Status = AnalysisJobStatus.Processing;
            job.StartedAt = DateTime.UtcNow;
            await filesDb.SaveChangesAsync(cancellationToken);

            if (string.IsNullOrEmpty(job.TempFilePath) || !File.Exists(job.TempFilePath))
            {
                throw new InvalidOperationException($"Temp file not found for job {jobId}");
            }

            Guid? validUserId = null;
            if (job.UserId.HasValue)
            {
                var userExists = await filesDb.Set<User>()
                    .AnyAsync(u => u.Id == job.UserId.Value, cancellationToken);
                if (userExists)
                {
                    validUserId = job.UserId;
                }
            }

            bool canProcess;
            await using (var validationStream = File.OpenRead(job.TempFilePath))
            {
                canProcess = await fileCheckingService.CanProcessFileAsync(validationStream, cancellationToken);
            }

            if (!canProcess)
            {
                var notAssemblyResponse = new FileCheckResponse(
                    job.FileName,
                    job.FileHash,
                    0,
                    ResponseMessageType.FileNotDotNetAssembly,
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    job.FileSizeBytes,
                    null, null, null, null, null, null, null);

                job.Status = AnalysisJobStatus.Completed;
                job.CompletedAt = DateTime.UtcNow;
                job.ResultJson = JsonSerializer.Serialize(notAssemblyResponse);
                await filesDb.SaveChangesAsync(cancellationToken);
                await SignalCompletionAsync(jobId, cancellationToken);
                return;
            }

            await using var fileStream = File.OpenRead(job.TempFilePath);

            var existingFile = await filesDb.Set<FileData>()
                .FirstOrDefaultAsync(x => x.Hash == job.FileHash, cancellationToken);

            FileCheckResponse response;

            if (existingFile == null)
            {
                var processingContext = await fileCheckingService.CheckFileAsync(fileStream, cancellationToken);
                var metadata = processingContext.Metadata;

                var storedFeatures = MapToStoredFeatures(processingContext.Features);

                var fileData = new FileData
                {
                    Hash = job.FileHash,
                    Score = (int)processingContext.Score,
                    FileName = job.FileName,
                    SizeBytes = job.FileSizeBytes,
                    DetectedType = "Assembly",
                    AddDateTime = DateTime.UtcNow,
                    LastScanned = DateTime.UtcNow,
                    TimesScanned = 1,
                    UserId = validUserId,
                    ApiKeyId = job.ApiKeyId,
                    AnalyzerVersion = processingContext.Version,
                    Features = storedFeatures,
                    AssemblyCompany = metadata?.Company,
                    AssemblyProduct = metadata?.Product,
                    AssemblyTitle = metadata?.Title,
                    AssemblyGuid = metadata?.Guid,
                    AssemblyCopyright = metadata?.Copyright
                };

                await filesDb.Set<FileData>().AddAsync(fileData, cancellationToken);
                await filesDb.SaveChangesAsync(cancellationToken);

                await ProcessBadgeTokenAsync(filesDb, job.BadgeToken, validUserId, fileData.Hash, cancellationToken);

                var scanTime = DateTime.UtcNow - scanStartTime;
                var isThreat = processingContext.Score >= 50;
                await analyticsService.RecordScanAsync(
                    job.FileName, job.FileHash, processingContext.Score, isThreat,
                    scanTime, validUserId, job.ApiKeyId, cancellationToken);

                response = new FileCheckResponse(
                    job.FileName,
                    fileData.Hash,
                    processingContext.Score,
                    ResponseMessageType.NewFileProcessedSuccessfully,
                    DateTime.UtcNow,
                    fileData.LastScanned,
                    job.FileSizeBytes,
                    fileData.AnalyzerVersion,
                    MapToFeatureResponses(storedFeatures),
                    fileData.AssemblyCompany,
                    fileData.AssemblyProduct,
                    fileData.AssemblyTitle,
                    fileData.AssemblyGuid,
                    fileData.AssemblyCopyright);
            }
            else if (!job.ForceAnalyze)
            {
                existingFile.TimesScanned++;
                if (validUserId.HasValue && !existingFile.UserId.HasValue)
                {
                    existingFile.UserId = validUserId;
                    existingFile.ApiKeyId = job.ApiKeyId;
                }
                await filesDb.SaveChangesAsync(cancellationToken);

                if (validUserId.HasValue)
                {
                    var scanTime = DateTime.UtcNow - scanStartTime;
                    var isThreat = existingFile.Score >= 50;
                    await analyticsService.RecordScanAsync(
                        existingFile.FileName ?? job.FileName, job.FileHash, existingFile.Score, isThreat,
                        scanTime, validUserId, job.ApiKeyId, cancellationToken);
                }

                response = new FileCheckResponse(
                    existingFile.FileName ?? job.FileName,
                    existingFile.Hash,
                    existingFile.Score,
                    ResponseMessageType.FileAlreadyUploadedSkippedAnalysis,
                    DateTime.UtcNow,
                    existingFile.LastScanned,
                    existingFile.SizeBytes,
                    existingFile.AnalyzerVersion,
                    MapToFeatureResponses(existingFile.Features),
                    existingFile.AssemblyCompany,
                    existingFile.AssemblyProduct,
                    existingFile.AssemblyTitle,
                    existingFile.AssemblyGuid,
                    existingFile.AssemblyCopyright);
            }
            else
            {
                var reProcessingContext = await fileCheckingService.CheckFileAsync(fileStream, cancellationToken);
                var reMetadata = reProcessingContext.Metadata;
                var reStoredFeatures = MapToStoredFeatures(reProcessingContext.Features);

                existingFile.Score = (int)reProcessingContext.Score;
                existingFile.FileName = job.FileName;
                existingFile.SizeBytes = job.FileSizeBytes;
                existingFile.LastScanned = DateTime.UtcNow;
                existingFile.TimesScanned++;
                existingFile.AnalyzerVersion = reProcessingContext.Version;
                existingFile.Features = reStoredFeatures;
                existingFile.AssemblyCompany = reMetadata?.Company;
                existingFile.AssemblyProduct = reMetadata?.Product;
                existingFile.AssemblyTitle = reMetadata?.Title;
                existingFile.AssemblyGuid = reMetadata?.Guid;
                existingFile.AssemblyCopyright = reMetadata?.Copyright;

                if (validUserId.HasValue && !existingFile.UserId.HasValue)
                {
                    existingFile.UserId = validUserId;
                    existingFile.ApiKeyId = job.ApiKeyId;
                }
                await filesDb.SaveChangesAsync(cancellationToken);

                var reScanTime = DateTime.UtcNow - scanStartTime;
                var reIsThreat = reProcessingContext.Score >= 50;
                await analyticsService.RecordScanAsync(
                    job.FileName, job.FileHash, reProcessingContext.Score, reIsThreat,
                    reScanTime, validUserId, job.ApiKeyId, cancellationToken);

                response = new FileCheckResponse(
                    existingFile.FileName,
                    existingFile.Hash,
                    reProcessingContext.Score,
                    ResponseMessageType.FileReanalyzedSuccessfully,
                    DateTime.UtcNow,
                    existingFile.LastScanned,
                    existingFile.SizeBytes,
                    existingFile.AnalyzerVersion,
                    MapToFeatureResponses(reStoredFeatures),
                    existingFile.AssemblyCompany,
                    existingFile.AssemblyProduct,
                    existingFile.AssemblyTitle,
                    existingFile.AssemblyGuid,
                    existingFile.AssemblyCopyright);
            }

            job.Status = AnalysisJobStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
            job.ResultJson = JsonSerializer.Serialize(response);
            await filesDb.SaveChangesAsync(cancellationToken);

            await CleanupTempFileAsync(job);
            await SignalCompletionAsync(jobId, cancellationToken);

            _logger.Information("Job {JobId} completed successfully", jobId);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Job {JobId} failed with error", jobId);

            job.Status = AnalysisJobStatus.Failed;
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorMessage = ex.Message;
            job.RetryCount++;
            await filesDb.SaveChangesAsync(cancellationToken);

            await SignalCompletionAsync(jobId, cancellationToken);
            throw;
        }
    }

    public async Task CleanupExpiredJobsAsync(CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var expiredJobs = await filesDb.Set<AnalysisJob>()
            .Where(j => j.ExpiresAt < DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var job in expiredJobs)
        {
            if (!job.TempFileCleanedUp)
            {
                await CleanupTempFileAsync(job);
            }
        }

        filesDb.Set<AnalysisJob>().RemoveRange(expiredJobs);
        await filesDb.SaveChangesAsync(cancellationToken);

        _logger.Information("Cleaned up {Count} expired analysis jobs", expiredJobs.Count);
    }

    public FileCheckResponse? DeserializeResult(string? resultJson)
    {
        if (string.IsNullOrEmpty(resultJson))
            return null;

        return JsonSerializer.Deserialize<FileCheckResponse>(resultJson);
    }

    private async Task SignalCompletionAsync(Guid jobId, CancellationToken cancellationToken)
    {
        var cacheKey = $"{JobCompletionKeyPrefix}{jobId}";
        await _cache.SetStringAsync(
            cacheKey,
            "completed",
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
            },
            cancellationToken);
    }

    private async Task CleanupTempFileAsync(AnalysisJob job)
    {
        if (!string.IsNullOrEmpty(job.TempFilePath) && File.Exists(job.TempFilePath))
        {
            try
            {
                File.Delete(job.TempFilePath);
                job.TempFileCleanedUp = true;
                _logger.Debug("Cleaned up temp file for job {JobId}", job.Id);
            }
            catch (Exception ex)
            {
                _logger.Warning(ex, "Failed to cleanup temp file for job {JobId}: {Path}",
                    job.Id, job.TempFilePath);
            }
        }
    }

    private async Task ProcessBadgeTokenAsync(
        FilesDbContext filesDb,
        string? badgeToken,
        Guid? validUserId,
        string fileHash,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(badgeToken) || !validUserId.HasValue)
            return;

        var badges = await filesDb.Set<Badge>()
            .Where(b => b.UserId == validUserId.Value &&
                       b.RequireTokenForUpdate == true &&
                       b.UpdateToken != null)
            .ToListAsync(cancellationToken);

        foreach (var badge in badges)
        {
            if (BadgeTokenHelper.VerifyToken(badgeToken, badge.UpdateToken!, badge.UpdateSalt))
            {
                _logger.Information("Badge {BadgeId} auto-updating via token to hash {Hash}",
                    badge.Id, fileHash);
                badge.LinkedFileHash = fileHash;
                badge.UpdatedAt = DateTime.UtcNow;
                badge.VersionUpdateCount++;
            }
        }

        if (badges.Any())
        {
            await filesDb.SaveChangesAsync(cancellationToken);
        }
    }

    private static List<StoredFeatureResult>? MapToStoredFeatures(Clients.FileChecker.FeatureResult[]? features)
    {
        if (features == null || features.Length == 0)
            return null;

        return features.Select(f => new StoredFeatureResult
        {
            Name = f.Name,
            Score = f.Score,
            Messages = f.Messages?.Select(m => new Database.Models.FeatureMessage
            {
                Text = m.Text
            }).ToList()
        }).ToList();
    }

    private static FeatureResultResponse[]? MapToFeatureResponses(List<StoredFeatureResult>? features)
    {
        if (features == null || features.Count == 0)
            return null;

        return features.Select(f => new FeatureResultResponse(
            f.Name,
            f.Score,
            f.Messages?.Select(m => m.Text).ToList()
        )).ToArray();
    }
}
