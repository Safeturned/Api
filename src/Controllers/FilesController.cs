using Asp.Versioning;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;
using Safeturned.Api.Models;
using Safeturned.Api.RateLimiting;
using ST.CheckingProcessor.Abstraction;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/files")]
[ApiController]
public class FilesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger _logger;

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
    [RequestSizeLimit(1L * 1024 * 1024 * 1024)] // 1 GB
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        try
        {
            _logger.Information("Processing uploaded file: {FileName}, Size: {Size} bytes",
                file.FileName, file.Length);

            var scanStartTime = DateTime.UtcNow;

            await using var stream = file.OpenReadStream();
            var canProcess = await _fileCheckingService.CanProcessFileAsync(stream);

            if (!canProcess)
            {
                _logger.Warning("File {FileName} is not a valid .NET assembly", file.FileName);
                return BadRequest("File is not a valid .NET assembly that can be processed.");
            }

            await using var checkStream = file.OpenReadStream();
            var processingContext = await _fileCheckingService.CheckFileAsync(checkStream);

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var fileHash = ComputeFileHash(file);
            var existingFile = await filesDb.Set<FileData>().FirstOrDefaultAsync(x => x.Hash == fileHash);

            FileData fileData;
            if (existingFile != null)
            {
                existingFile.Score = (int)processingContext.Score;
                existingFile.FileName = file.FileName;
                existingFile.SizeBytes = file.Length;
                existingFile.LastScanned = DateTime.UtcNow;
                existingFile.TimesScanned++;
                fileData = existingFile;
            }
            else
            {
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
            }

            await filesDb.SaveChangesAsync();

            var scanTime = DateTime.UtcNow - scanStartTime;
            var isThreat = processingContext.Score >= 50; // Consider scores >= 50 as threats

            // Record analytics
            await _analyticsService.RecordScanAsync(file.FileName, processingContext.Score, isThreat, scanTime);

            _logger.Information("File {FileName} processed successfully. Score: {Score}, Time: {ScanTime}ms",
                file.FileName, processingContext.Score, scanTime.TotalMilliseconds);

            var response = new FileCheckResponse
            {
                FileName = file.FileName,
                Score = processingContext.Score,
                Checked = processingContext.Checked,
                Message = "File processed successfully",
                ProcessedAt = DateTime.UtcNow,
                FileSizeBytes = file.Length
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error processing file {FileName}", file.FileName);
            throw; // Let the GlobalExceptionHandler capture with Sentry
        }
    }

    [HttpGet("{hash}")]
    public async Task<IActionResult> GetFileResult(string hash)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var fileData = await filesDb.Set<FileData>()
                .FirstOrDefaultAsync(x => x.Hash == hash);

            if (fileData == null)
                return NotFound($"File with hash {hash} not found.");

            var response = new FileCheckResponse
            {
                FileName = fileData.FileName ?? "Unknown",
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
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = sha256.ComputeHash(stream);
        return Convert.ToBase64String(hashBytes);
    }
}