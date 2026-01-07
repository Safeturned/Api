using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
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
    private readonly IChunkStorageService _chunkStorageService;
    private readonly IAnalysisJobService _analysisJobService;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    private const int DefaultV1TimeoutSeconds = 30;

    public ChunkedFilesController(
        IChunkStorageService chunkStorageService,
        IAnalysisJobService analysisJobService,
        ILogger logger,
        IConfiguration configuration)
    {
        _chunkStorageService = chunkStorageService;
        _analysisJobService = analysisJobService;
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

            var (userId, apiKeyId) = HttpContext.GetUserContext();
            var clientIp = HttpContext.GetIPAddress();

            await using var fileStream = new FileStream(finalFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            var job = await _analysisJobService.CreateJobAsync(
                fileStream,
                session.FileName,
                session.FileSizeBytes,
                userId,
                apiKeyId,
                clientIp,
                false,
                request.BadgeToken,
                cancellationToken);

            await _analysisJobService.EnqueueJobAsync(job, cancellationToken);

            await _chunkStorageService.CleanupSessionAsync(request.SessionId, cancellationToken);

            var timeoutSeconds = _configuration.GetValue("Analysis:V1TimeoutSeconds", DefaultV1TimeoutSeconds);
            var timeout = TimeSpan.FromSeconds(timeoutSeconds);

            var completedJob = await _analysisJobService.WaitForCompletionAsync(job.Id, timeout, cancellationToken);

            if (completedJob?.Status == Database.Models.AnalysisJobStatus.Completed)
            {
                var result = _analysisJobService.DeserializeResult(completedJob.ResultJson);
                if (result != null)
                {
                    _logger.Information("Chunked upload {SessionId} processed successfully via job queue. JobId: {JobId}",
                        request.SessionId, job.Id);
                    return Ok(result);
                }
            }

            if (completedJob?.Status == Database.Models.AnalysisJobStatus.Failed)
            {
                _logger.Warning("Chunked upload {SessionId} analysis failed. JobId: {JobId}, Error: {Error}",
                    request.SessionId, job.Id, completedJob.ErrorMessage);
                return StatusCode(500, new
                {
                    Message = "File analysis failed",
                    JobId = job.Id,
                    Error = completedJob.ErrorMessage
                });
            }

            _logger.Information("Chunked upload {SessionId} analysis timed out after {Timeout}s. JobId: {JobId}",
                request.SessionId, timeoutSeconds, job.Id);

            return Accepted(new FileUploadAsyncFallbackResponse(
                "Analysis is taking longer than expected. Use the job ID to check status.",
                job.Id,
                $"/v2/files/jobs/{job.Id}"));
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