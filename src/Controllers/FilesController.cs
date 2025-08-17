using System.Security.Cryptography;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Filters;
using Safeturned.Api.Models;
using Safeturned.Api.RateLimiting;
using Safeturned.Api.Services;
using Safeturned.FileChecker.Modules;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/files")]
[ApiController]
[ApiSecurityFilter]
public class FilesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger _logger;
    /// <summary>
    /// 500 MB
    /// </summary>
    private const long MaxFileSize = 500L * 1024 * 1024;

    public FilesController(
        IServiceScopeFactory serviceScopeFactory,
        IFileCheckingService fileCheckingService,
        IAnalyticsService analyticsService,
        ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _fileCheckingService = fileCheckingService;
        _analyticsService = analyticsService;
        _logger = logger.ForContext<FilesController>();
    }

    [HttpPost]
    [EnableRateLimiting(KnownRateLimitPolicies.UploadFile)]
    [RequestSizeLimit(MaxFileSize)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSize)]
    public async Task<IActionResult> UploadFile(IFormFile file, bool forceAnalyze)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (!string.Equals(Path.GetExtension(file.FileName), ".dll", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .DLL files are allowed.");

        try
        {
            _logger.Information("Processing uploaded file: {FileName}, Size: {Size} bytes",
                file.FileName, file.Length);

            var scanStartTime = DateTime.UtcNow;

            bool canProcess;
            await using (var stream = file.OpenReadStream())
            {
                canProcess = await _fileCheckingService.CanProcessFileAsync(stream);
            }

            if (!canProcess)
            {
                _logger.Warning("File {FileName} is not a valid .NET assembly", file.FileName);
                return BadRequest("File is not a valid Unturned Plugin that can be processed.");
            }

            var fileHash = ComputeFileHash(file);

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var existingFile = await filesDb.Set<FileData>().FirstOrDefaultAsync(x => x.Hash == fileHash);
            FileData fileData;
            if (existingFile == null)
            {
                IModuleProcessingContext processingContext;
                await using (var checkStream = file.OpenReadStream())
                {
                    processingContext = await _fileCheckingService.CheckFileAsync(checkStream);
                }

                fileData = new FileData
                {
                    Hash = fileHash,
                    Score = (int)processingContext.Score,
                    FileName = file.FileName,
                    SizeBytes = file.Length,
                    DetectedType = "Assembly",
                    AddDateTime = DateTime.UtcNow,
                    LastScanned = DateTime.UtcNow,
                    TimesScanned = 1
                };

                await filesDb.Set<FileData>().AddAsync(fileData);
                await filesDb.SaveChangesAsync();

                var scanTime = DateTime.UtcNow - scanStartTime;
                var isThreat = processingContext.Score >= 50;

                await _analyticsService.RecordScanAsync(file.FileName, processingContext.Score, isThreat, scanTime);

                _logger.Information("New file {FileName} processed successfully. Score: {Score}, Time: {ScanTime}ms",
                    file.FileName, processingContext.Score, scanTime.TotalMilliseconds);

                return Ok(new FileCheckResponse
                {
                    FileName = file.FileName,
                    FileHash = fileData.Hash,
                    Score = processingContext.Score,
                    Checked = true,
                    Message = "New file processed successfully",
                    ProcessedAt = DateTime.UtcNow,
                    LastScanned = fileData.LastScanned,
                    FileSizeBytes = file.Length
                });
            }
            if (!forceAnalyze)
            {
                existingFile.TimesScanned++;

                await filesDb.SaveChangesAsync();

                _logger.Information("File {FileName} already exists. Returning existing record without re-analysis.",
                    file.FileName);

                return Ok(new FileCheckResponse
                {
                    FileName = existingFile.FileName,
                    FileHash = existingFile.Hash,
                    Score = existingFile.Score,
                    Checked = false,
                    Message = "File already uploaded. Skipped analysis.",
                    ProcessedAt = DateTime.UtcNow,
                    LastScanned = existingFile.LastScanned,
                    FileSizeBytes = existingFile.SizeBytes
                });
            }

            IModuleProcessingContext reProcessingContext;
            await using (var checkStream = file.OpenReadStream())
            {
                reProcessingContext = await _fileCheckingService.CheckFileAsync(checkStream);
            }

            existingFile.Score = (int)reProcessingContext.Score;
            existingFile.FileName = file.FileName;
            existingFile.SizeBytes = file.Length;
            existingFile.LastScanned = DateTime.UtcNow;
            existingFile.TimesScanned++;

            await filesDb.SaveChangesAsync();

            var reScanTime = DateTime.UtcNow - scanStartTime;
            var reIsThreat = reProcessingContext.Score >= 50;

            await _analyticsService.RecordScanAsync(file.FileName, reProcessingContext.Score, reIsThreat, reScanTime);

            _logger.Information("File {FileName} re-analyzed successfully. Score: {Score}, Time: {ScanTime}ms",
                file.FileName, reProcessingContext.Score, reScanTime.TotalMilliseconds);

            return Ok(new FileCheckResponse
            {
                FileName = existingFile.FileName,
                FileHash = existingFile.Hash,
                Score = reProcessingContext.Score,
                Checked = true,
                Message = "File re-analyzed successfully",
                ProcessedAt = DateTime.UtcNow,
                LastScanned = existingFile.LastScanned,
                FileSizeBytes = existingFile.SizeBytes
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error processing file {FileName}", file.FileName);
            throw; // Let GlobalExceptionHandler handle it
        }
    }


    [HttpGet("{hash}")]
    [EnableRateLimiting(KnownRateLimitPolicies.UploadFile)]
    public async Task<IActionResult> GetFileResult(string hash)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>().FirstOrDefaultAsync(x => x.Hash == hash);
            if (fileData == null)
                return NotFound($"File with hash {hash} not found.");
            var response = new FileCheckResponse
            {
                FileName = fileData.FileName ?? "Unknown",
                FileHash = fileData.Hash,
                Score = fileData.Score,
                Checked = true, // If it's in the database, it was checked
                Message = "File retrieved from database",
                ProcessedAt = fileData.LastScanned,
                FileSizeBytes = fileData.SizeBytes
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving file result for hash {Hash}", hash);
            throw; // Let the GlobalExceptionHandler capture with Sentry
        }
    }

    [HttpGet("analytics")]
    [EnableRateLimiting(KnownRateLimitPolicies.UploadFile)]
    public async Task<IActionResult> GetAnalytics([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        try
        {
            AnalyticsData analytics;

            if (from.HasValue && to.HasValue)
            {
                analytics = await _analyticsService.GetAnalyticsAsync(from.Value, to.Value);
            }
            else
            {
                analytics = await _analyticsService.GetAnalyticsAsync();
            }

            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving analytics");
            throw; // Let the GlobalExceptionHandler capture with Sentry
        }
    }

    private static string ComputeFileHash(IFormFile file)
    {
        using var sha256 = SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = sha256.ComputeHash(stream);
        return Convert.ToBase64String(hashBytes);
    }
}