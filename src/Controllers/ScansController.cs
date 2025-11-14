using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using System.Security.Claims;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/users/me/scans")]
[Authorize]
public class ScansController : ControllerBase
{
    private readonly FilesDbContext _context;
    private readonly ILogger<ScansController> _logger;

    public ScansController(FilesDbContext context, ILogger<ScansController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetScans(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? filter = null)
    {
        var userId = GetUserId();

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _context.Set<Database.Models.ScanRecord>()
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter))
        {
            var filterLower = filter.ToLower();
            query = query.Where(s => s.FileName.ToLower().Contains(filterLower));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var scans = await query
            .OrderByDescending(s => s.ScanDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                id = s.Id,
                fileName = s.FileName,
                fileHash = s.FileHash,
                score = s.Score,
                isThreat = s.IsThreat,
                scanTimeMs = s.ScanTimeMs,
                scanDate = s.ScanDate
            })
            .ToListAsync();

        return Ok(new
        {
            scans,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage = page < totalPages,
                hasPreviousPage = page > 1
            }
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetScanStats()
    {
        var userId = GetUserId();

        var stats = await _context.Set<Database.Models.ScanRecord>()
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .GroupBy(s => 1)
            .Select(g => new
            {
                totalScans = g.Count(),
                threatsDetected = g.Count(s => s.IsThreat),
                cleanFiles = g.Count(s => !s.IsThreat),
                averageScore = g.Average(s => s.Score),
                averageScanTime = g.Average(s => s.ScanTimeMs)
            })
            .FirstOrDefaultAsync();

        if (stats == null)
        {
            return Ok(new
            {
                totalScans = 0,
                threatsDetected = 0,
                cleanFiles = 0,
                averageScore = 0.0,
                averageScanTime = 0.0
            });
        }

        return Ok(stats);
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecentScans([FromQuery] int limit = 10)
    {
        var userId = GetUserId();

        if (limit < 1 || limit > 50) limit = 10;

        var recentScans = await _context.Set<Database.Models.ScanRecord>()
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.ScanDate)
            .Take(limit)
            .Select(s => new
            {
                id = s.Id,
                fileName = s.FileName,
                fileHash = s.FileHash,
                score = s.Score,
                isThreat = s.IsThreat,
                scanDate = s.ScanDate
            })
            .ToListAsync();

        return Ok(recentScans);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user ID in token");
        }

        return userId;
    }
}
