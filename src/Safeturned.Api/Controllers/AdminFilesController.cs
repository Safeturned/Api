using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/admin/files")]
[Authorize(Policy = KnownAuthPolicies.CanModerateFiles)]
public class AdminFilesController : ControllerBase
{
    private readonly IFileAdminService _fileAdminService;
    private readonly ILogger _logger;

    public AdminFilesController(IFileAdminService fileAdminService, ILogger logger)
    {
        _fileAdminService = fileAdminService;
        _logger = logger.ForContext<AdminFilesController>();
    }

    [HttpGet]
    public async Task<IActionResult> GetFiles(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] bool? isTakenDown = null,
        [FromQuery] AdminVerdict? verdict = null,
        [FromQuery] bool? isMalicious = null,
        [FromQuery] string? sortBy = "date",
        [FromQuery] string? sortOrder = "desc",
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        var (files, totalCount) = await _fileAdminService.GetFilesAsync(
            page, pageSize, search, isTakenDown, verdict, isMalicious, sortBy, sortOrder, cancellationToken);

        var result = files.Select(f => new
        {
            hash = f.Hash,
            fileName = f.FileName,
            score = f.Score,
            sizeBytes = f.SizeBytes,
            isMalicious = f.Score >= 50,
            isTakenDown = f.IsTakenDown,
            takenDownAt = f.TakenDownAt,
            takenDownReason = f.TakedownReason,
            currentVerdict = f.CurrentVerdict?.ToString(),
            publicMessage = f.PublicAdminMessage,
            lastScanned = f.LastScanned,
            addedAt = f.AddDateTime,
            userId = f.UserId,
            username = f.User?.Username ?? f.User?.Email
        });

        return Ok(new
        {
            page,
            pageSize,
            totalCount,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            files = result
        });
    }

    [HttpGet("{hash}")]
    public async Task<IActionResult> GetFileDetails(string hash, CancellationToken cancellationToken = default)
    {
        var file = await _fileAdminService.GetFileWithReviewsAsync(hash, cancellationToken);
        if (file == null)
            return NotFound(new { error = "File not found" });

        return Ok(new
        {
            hash = file.Hash,
            fileName = file.FileName,
            score = file.Score,
            isMalicious = file.Score >= 50,
            sizeBytes = file.SizeBytes,
            detectedType = file.DetectedType,
            analyzerVersion = file.AnalyzerVersion,
            features = file.Features?.Select(f => new
            {
                name = f.Name,
                score = f.Score,
                messages = f.Messages?.Select(m => m.Text)
            }),
            assemblyInfo = new
            {
                company = file.AssemblyCompany,
                product = file.AssemblyProduct,
                title = file.AssemblyTitle,
                guid = file.AssemblyGuid,
                copyright = file.AssemblyCopyright
            },
            isTakenDown = file.IsTakenDown,
            takenDownAt = file.TakenDownAt,
            takenDownBy = file.TakenDownByUser?.Username ?? file.TakenDownByUser?.Email,
            takenDownReason = file.TakedownReason,
            currentVerdict = file.CurrentVerdict?.ToString(),
            publicMessage = file.PublicAdminMessage,
            addedAt = file.AddDateTime,
            lastScanned = file.LastScanned,
            timesScanned = file.TimesScanned,
            uploadedBy = new
            {
                userId = file.UserId,
                username = file.User?.Username ?? file.User?.Email
            },
            reviewHistory = file.AdminReviews?.OrderByDescending(r => r.CreatedAt).Select(r => new
            {
                id = r.Id,
                verdict = r.Verdict.ToString(),
                publicMessage = r.PublicMessage,
                internalNotes = r.InternalNotes,
                reviewedAt = r.CreatedAt,
                reviewer = new
                {
                    id = r.ReviewerId,
                    username = r.Reviewer?.Username ?? r.Reviewer?.Email
                }
            })
        });
    }

    [HttpPost("{hash}/reviews")]
    public async Task<IActionResult> AddReview(
        string hash,
        [FromBody] AddReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var reviewerId = GetUserId();

        try
        {
            var review = await _fileAdminService.AddReviewAsync(
                hash, reviewerId, request.Verdict, request.PublicMessage, request.InternalNotes, cancellationToken);

            _logger.Information("Moderator {ModeratorId} reviewed file {Hash} with verdict {Verdict}",
                reviewerId, hash, request.Verdict);

            return Ok(new
            {
                id = review.Id,
                fileHash = review.FileHash,
                verdict = review.Verdict.ToString(),
                publicMessage = review.PublicMessage,
                createdAt = review.CreatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.Warning(ex, "File not found for review: {Hash}", hash);
            return NotFound(new { error = "File not found" });
        }
    }

    [HttpPost("{hash}/takedown")]
    public async Task<IActionResult> TakedownFile(
        string hash,
        [FromBody] TakedownRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { error = "Takedown reason is required" });

        var moderatorId = GetUserId();
        var file = await _fileAdminService.TakedownFileAsync(
            hash, moderatorId, request.Reason, request.PublicMessage, cancellationToken);

        if (file == null)
            return NotFound(new { error = "File not found" });

        return Ok(new
        {
            hash = file.Hash,
            isTakenDown = file.IsTakenDown,
            takenDownAt = file.TakenDownAt,
            reason = file.TakedownReason,
            message = "File has been taken down"
        });
    }

    [HttpPost("{hash}/restore")]
    public async Task<IActionResult> RestoreFile(
        string hash,
        [FromBody] RestoreRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var moderatorId = GetUserId();
        var file = await _fileAdminService.RestoreFileAsync(
            hash, moderatorId, request?.InternalNotes, cancellationToken);

        if (file == null)
            return NotFound(new { error = "File not found" });

        return Ok(new
        {
            hash = file.Hash,
            isTakenDown = file.IsTakenDown,
            message = "File has been restored"
        });
    }

    [HttpGet("{hash}/reviews")]
    public async Task<IActionResult> GetReviewHistory(string hash, CancellationToken cancellationToken = default)
    {
        var reviews = await _fileAdminService.GetReviewHistoryAsync(hash, cancellationToken);

        return Ok(reviews.Select(r => new
        {
            id = r.Id,
            verdict = r.Verdict.ToString(),
            publicMessage = r.PublicMessage,
            internalNotes = r.InternalNotes,
            reviewedAt = r.CreatedAt,
            reviewer = new
            {
                id = r.ReviewerId,
                username = r.Reviewer?.Username ?? r.Reviewer?.Email
            }
        }));
    }

    [HttpGet("reviews/audit")]
    [Authorize(Policy = KnownAuthPolicies.AdminOnly)]
    public async Task<IActionResult> GetAuditLog(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] Guid? reviewerId = null,
        [FromQuery] AdminVerdict? verdict = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        var (reviews, totalCount) = await _fileAdminService.GetAllReviewsAsync(
            page, pageSize, reviewerId, verdict, from, to, cancellationToken);

        return Ok(new
        {
            page,
            pageSize,
            totalCount,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            reviews = reviews.Select(r => new
            {
                id = r.Id,
                fileHash = r.FileHash,
                fileName = r.File?.FileName,
                verdict = r.Verdict.ToString(),
                publicMessage = r.PublicMessage,
                internalNotes = r.InternalNotes,
                reviewedAt = r.CreatedAt,
                reviewer = new
                {
                    id = r.ReviewerId,
                    username = r.Reviewer?.Username ?? r.Reviewer?.Email
                }
            })
        });
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID in token");

        return userId;
    }
}

public record AddReviewRequest(
    AdminVerdict Verdict,
    string? PublicMessage,
    string? InternalNotes
);

public record TakedownRequest(
    string Reason,
    string? PublicMessage
);

public record RestoreRequest(
    string? InternalNotes
);
