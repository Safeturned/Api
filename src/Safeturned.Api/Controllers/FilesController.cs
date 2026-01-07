using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
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
[Route("v{version:apiVersion}/files")]
[ApiController]
[ApiSecurityFilter]
public class FilesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly IAnalysisJobService _analysisJobService;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    private const int DefaultV1TimeoutSeconds = 30;

    public FilesController(
        IServiceScopeFactory serviceScopeFactory,
        IFileCheckingService fileCheckingService,
        IAnalyticsService analyticsService,
        IAnalysisJobService analysisJobService,
        ILogger logger,
        IConfiguration configuration)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _fileCheckingService = fileCheckingService;
        _analyticsService = analyticsService;
        _analysisJobService = analysisJobService;
        _logger = logger.ForContext<FilesController>();
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> UploadFile(IFormFile file, bool forceAnalyze, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (!string.Equals(Path.GetExtension(file.FileName), FileConstants.AllowedExtension, StringComparison.OrdinalIgnoreCase))
            return BadRequest(FileConstants.ErrorMessageInvalidExtension);

        try
        {
            _logger.Information("Processing uploaded file: {FileName}, Size: {Size} bytes",
                file.FileName, file.Length);

            var (userId, apiKeyId) = HttpContext.GetUserContext();
            var clientIp = HttpContext.GetIPAddress();
            var badgeToken = Request.Form["badgeToken"].FirstOrDefault();

            await using var stream = file.OpenReadStream();

            var job = await _analysisJobService.CreateJobAsync(
                stream,
                file.FileName,
                file.Length,
                userId,
                apiKeyId,
                clientIp,
                forceAnalyze,
                badgeToken,
                cancellationToken);

            await _analysisJobService.EnqueueJobAsync(job, cancellationToken);

            var timeoutSeconds = _configuration.GetValue("Analysis:V1TimeoutSeconds", DefaultV1TimeoutSeconds);
            var timeout = TimeSpan.FromSeconds(timeoutSeconds);

            var completedJob = await _analysisJobService.WaitForCompletionAsync(job.Id, timeout, cancellationToken);

            if (completedJob?.Status == AnalysisJobStatus.Completed)
            {
                var result = _analysisJobService.DeserializeResult(completedJob.ResultJson);
                if (result != null)
                {
                    _logger.Information("File {FileName} processed successfully via job queue. JobId: {JobId}",
                        file.FileName, job.Id);
                    return Ok(result);
                }
            }

            if (completedJob?.Status == AnalysisJobStatus.Failed)
            {
                _logger.Warning("File {FileName} analysis failed. JobId: {JobId}, Error: {Error}",
                    file.FileName, job.Id, completedJob.ErrorMessage);
                return StatusCode(500, new
                {
                    Message = "File analysis failed",
                    JobId = job.Id,
                    Error = completedJob.ErrorMessage
                });
            }

            _logger.Information("File {FileName} analysis timed out after {Timeout}s. JobId: {JobId}",
                file.FileName, timeoutSeconds, job.Id);

            return Accepted(new FileUploadAsyncFallbackResponse(
                "Analysis is taking longer than expected. Use the job ID to check status.",
                job.Id,
                $"/v2/files/jobs/{job.Id}"));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error processing file {FileName}", file.FileName);
            throw;
        }
    }

    [HttpGet("{hash}")]
    public async Task<IActionResult> GetFileResult(string hash, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>()
                .Include(f => f.AdminReviews)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Hash == hash, cancellationToken);
            if (fileData == null)
                return NotFound($"File with hash {hash} not found.");

            if (fileData.IsTakenDown)
            {
                var isModerator = UserPermissionHelper.HasPermissionFromClaims(User, UserPermission.ModerateFiles);

                if (!isModerator)
                {
                    return NotFound(new
                    {
                        error = "This file has been taken down",
                        publicMessage = fileData.PublicAdminMessage,
                        takenDown = true
                    });
                }
            }

            var latestReview = fileData.AdminReviews?
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefault();

            return Ok(new
            {
                FileName = fileData.FileName ?? "Unknown",
                FileHash = fileData.Hash,
                Score = fileData.Score,
                MessageType = ResponseMessageType.FileRetrievedFromDatabase,
                ProcessedAt = default(DateTime),
                LastScanned = fileData.LastScanned,
                FileSizeBytes = fileData.SizeBytes,
                AnalyzerVersion = fileData.AnalyzerVersion,
                Features = fileData.Features?.Select(f => new FeatureResultResponse(f.Name, f.Score, f.Messages?.Select(m => m.Text).ToList())).ToArray(),
                AssemblyCompany = fileData.AssemblyCompany,
                AssemblyProduct = fileData.AssemblyProduct,
                AssemblyTitle = fileData.AssemblyTitle,
                AssemblyGuid = fileData.AssemblyGuid,
                AssemblyCopyright = fileData.AssemblyCopyright,
                AdminVerdict = fileData.CurrentVerdict?.ToString(),
                AdminMessage = fileData.PublicAdminMessage,
                AdminReviewedAt = latestReview?.CreatedAt,
                IsReviewed = fileData.CurrentVerdict.HasValue && fileData.CurrentVerdict != AdminVerdict.None,
                IsTakenDown = fileData.IsTakenDown
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving file result for hash {Hash}", hash);
            throw;
        }
    }

    [HttpGet("version")]
    public async Task<IActionResult> GetAnalyzerVersion(CancellationToken cancellationToken = default)
    {
        var version = await _fileCheckingService.GetVersionAsync(cancellationToken);
        return Ok(new { version });
    }

    [HttpGet("filename/{filename}")]
    public async Task<IActionResult> GetFileByFilename(string filename, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>()
                .AsNoTracking()
                .Where(x => x.FileName == filename)
                .OrderByDescending(x => x.LastScanned)
                .FirstOrDefaultAsync(cancellationToken);

            if (fileData == null)
                return NotFound($"File with name {filename} not found.");

            return Ok(fileData);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving file by filename {FileName}", filename);
            throw;
        }
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _analyticsService.GetAnalyticsAsync(cancellationToken);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving analytics");
            throw;
        }
    }

    [HttpGet("analytics/range")]
    [Authorize(Policy = KnownAuthPolicies.AdminOnly)]
    public async Task<IActionResult> GetAnalyticsWithDateRange([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _analyticsService.GetAnalyticsAsync(from, to, cancellationToken);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving analytics with date range");
            throw;
        }
    }
}