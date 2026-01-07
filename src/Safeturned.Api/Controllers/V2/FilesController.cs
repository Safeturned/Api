using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers.V2;

[ApiVersion("2.0")]
[Route("v{version:apiVersion}/files")]
[ApiController]
[ApiSecurityFilter]
public class FilesController : ControllerBase
{
    private readonly IAnalysisJobService _analysisJobService;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly ILogger _logger;

    public FilesController(
        IAnalysisJobService analysisJobService,
        IFileCheckingService fileCheckingService,
        ILogger logger)
    {
        _analysisJobService = analysisJobService;
        _fileCheckingService = fileCheckingService;
        _logger = logger.ForContext<FilesController>();
    }

    [HttpPost]
    public async Task<IActionResult> UploadFile(IFormFile file, bool forceAnalyze, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { messageType = ResponseMessageType.NoFileUploaded });

        if (!string.Equals(Path.GetExtension(file.FileName), FileConstants.AllowedExtension, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { messageType = ResponseMessageType.InvalidFileExtension });

        try
        {
            _logger.Information("V2: Processing uploaded file: {FileName}, Size: {Size} bytes",
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

            _logger.Information("V2: Job {JobId} created and enqueued for file {FileName}",
                job.Id, file.FileName);

            return Accepted(new AnalysisJobSubmitResponse(
                job.Id,
                job.Status,
                ResponseMessageType.JobQueuedSuccessfully));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "V2: Error processing file {FileName}", file.FileName);
            throw;
        }
    }

    [HttpGet("jobs/{jobId:guid}")]
    public async Task<IActionResult> GetJobStatus(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _analysisJobService.GetJobAsync(jobId, cancellationToken);
        if (job == null)
            return NotFound(new { messageType = ResponseMessageType.JobNotFound });

        var result = _analysisJobService.DeserializeResult(job.ResultJson);

        return Ok(new AnalysisJobStatusResponse(
            job.Id,
            job.Status,
            job.CreatedAt,
            job.StartedAt,
            job.CompletedAt,
            result,
            job.ErrorMessage));
    }

    [HttpGet("version")]
    public async Task<IActionResult> GetAnalyzerVersion(CancellationToken cancellationToken = default)
    {
        var version = await _fileCheckingService.GetVersionAsync(cancellationToken);
        return Ok(new { version });
    }
}
