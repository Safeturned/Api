using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;
using Safeturned.Api.RateLimiting;
using Safeturned.Api.Services;
using Safeturned.FileChecker.Modules;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/files/upload")]
[ApiController]
[ApiSecurityFilter]
public class ChunkedFilesController : ControllerBase
{
    private readonly IChunkStorageService _chunkStorageService;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    public ChunkedFilesController(
        IChunkStorageService chunkStorageService,
        IFileCheckingService fileCheckingService,
        IAnalyticsService analyticsService,
        ILogger logger,
        IConfiguration configuration)
    {
        _chunkStorageService = chunkStorageService;
        _fileCheckingService = fileCheckingService;
        _analyticsService = analyticsService;
        _logger = logger.ForContext<ChunkedFilesController>();
        _configuration = configuration;
    }

    [HttpPost("initiate")]
    [EnableRateLimiting(KnownRateLimitPolicies.ChunkedUpload)]
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

        if (!string.Equals(Path.GetExtension(request.FileName), ".dll", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .DLL files are allowed.");

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

            return Ok(new InitiateUploadResponse
            {
                SessionId = sessionId,
                Message = "Upload session initiated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error initiating upload session for file {FileName}", request.FileName);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("chunk")]
    [EnableRateLimiting(KnownRateLimitPolicies.ChunkedUpload)]
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
                return Ok(new UploadChunkResponse
                {
                    Success = true,
                    Message = "Chunk already uploaded"
                });
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

            return Ok(new UploadChunkResponse
            {
                Success = true,
                Message = "Chunk uploaded successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error uploading chunk {ChunkIndex} for session {SessionId}", request.ChunkIndex, request.SessionId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("complete")]
    [EnableRateLimiting(KnownRateLimitPolicies.ChunkedUpload)]
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
                return BadRequest("File is not a valid Unturned Plugin that can be processed.");
            }
            IModuleProcessingContext processingContext;
            await using (var stream = new FileStream(finalFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                processingContext = await _fileCheckingService.CheckFileAsync(stream, cancellationToken);
            }

            var scanTime = DateTime.UtcNow - scanStartTime;
            var isThreat = processingContext.Score >= 50;

            await _analyticsService.RecordScanAsync(session.FileName, processingContext.Score, isThreat, scanTime);

            _logger.Information("File processing completed for session {SessionId}. Score: {Score}, Time: {ScanTime}ms",
                request.SessionId, processingContext.Score, scanTime.TotalMilliseconds);

            await _chunkStorageService.CleanupSessionAsync(request.SessionId);

            return Ok(new FileCheckResponse
            {
                FileName = session.FileName,
                FileHash = session.FileHash,
                Score = processingContext.Score,
                Checked = true,
                Message = "File processed successfully",
                ProcessedAt = DateTime.UtcNow,
                LastScanned = DateTime.UtcNow,
                FileSizeBytes = session.FileSizeBytes
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error completing upload for session {SessionId}", request.SessionId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("status/{sessionId}")]
    [EnableRateLimiting(KnownRateLimitPolicies.ChunkedUpload)]
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

            var uploadedChunks = session.UploadedChunks.Count(chunk => chunk);
            var progress = (double)uploadedChunks / session.TotalChunks * 100;

            return Ok(new UploadStatusResponse
            {
                SessionId = sessionId,
                FileName = session.FileName,
                TotalChunks = session.TotalChunks,
                UploadedChunks = uploadedChunks,
                ProgressPercentage = Math.Round(progress, 2),
                IsCompleted = session.IsCompleted,
                ExpiresAt = session.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error getting upload status for session {SessionId}", sessionId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("cancel/{sessionId}")]
    [EnableRateLimiting(KnownRateLimitPolicies.ChunkedUpload)]
    public async Task<IActionResult> CancelUpload(string sessionId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(sessionId))
            return BadRequest("SessionId is required.");

        try
        {
            await _chunkStorageService.CleanupSessionAsync(sessionId, cancellationToken);
            _logger.Information("Cancelled upload session {SessionId}", sessionId);

            return Ok(new { Message = "Upload cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error cancelling upload session {SessionId}", sessionId);
            return StatusCode(500, "Internal server error");
        }
    }
}