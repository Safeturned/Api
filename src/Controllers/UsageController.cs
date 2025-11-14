using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using System.Security.Claims;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/users/me/usage")]
[Authorize]
public class UsageController : ControllerBase
{
    private readonly FilesDbContext _context;
    private readonly ILogger _logger;

    public UsageController(FilesDbContext context, ILogger logger)
    {
        _context = context;
        _logger = logger.ForContext<UsageController>();
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetUsageSummary()
    {
        var userId = GetUserId();

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var totalRequests = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .CountAsync();

        var last30DaysRequests = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= DateTime.UtcNow.AddDays(-30))
            .CountAsync();

        var averageResponseTime = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .AverageAsync(u => (double?)u.ResponseTimeMs) ?? 0;

        var successRate = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .GroupBy(u => 1)
            .Select(g => new
            {
                total = g.Count(),
                successful = g.Count(u => u.StatusCode >= 200 && u.StatusCode < 300)
            })
            .FirstOrDefaultAsync();

        var successRatePercent = successRate != null && successRate.total > 0
            ? (double)successRate.successful / successRate.total * 100
            : 100.0;

        return Ok(new
        {
            totalRequests,
            last30DaysRequests,
            averageResponseTime = Math.Round(averageResponseTime, 2),
            successRate = Math.Round(successRatePercent, 2)
        });
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyUsage([FromQuery] int days = 30)
    {
        var userId = GetUserId();

        if (days < 1 || days > 90) days = 30;

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        var dailyUsage = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= startDate)
            .GroupBy(u => u.RequestedAt.Date)
            .Select(g => new
            {
                date = g.Key,
                requests = g.Count(),
                averageResponseTime = g.Average(u => u.ResponseTimeMs),
                errors = g.Count(u => u.StatusCode >= 400)
            })
            .OrderBy(d => d.date)
            .ToListAsync();

        var allDates = Enumerable.Range(0, days)
            .Select(i => startDate.AddDays(i))
            .Select(date => new
            {
                date,
                requests = dailyUsage.FirstOrDefault(d => d.date == date)?.requests ?? 0,
                averageResponseTime = dailyUsage.FirstOrDefault(d => d.date == date)?.averageResponseTime ?? 0,
                errors = dailyUsage.FirstOrDefault(d => d.date == date)?.errors ?? 0
            })
            .ToList();

        return Ok(allDates);
    }

    [HttpGet("endpoints")]
    public async Task<IActionResult> GetEndpointUsage()
    {
        var userId = GetUserId();

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var endpointUsage = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .GroupBy(u => u.EndpointId)
            .Select(g => new
            {
                endpointId = g.Key,
                requests = g.Count(),
                averageResponseTime = g.Average(u => u.ResponseTimeMs),
                errors = g.Count(u => u.StatusCode >= 400)
            })
            .OrderByDescending(e => e.requests)
            .Take(10)
            .ToListAsync();

        var result = endpointUsage.Select(e => new
        {
            endpoint = EndpointRegistry.GetEndpoint(e.endpointId) ?? $"Unknown ({e.endpointId})",
            e.requests,
            averageResponseTime = Math.Round(e.averageResponseTime, 2),
            e.errors
        });

        return Ok(result);
    }

    [HttpGet("methods")]
    public async Task<IActionResult> GetMethodUsage()
    {
        var userId = GetUserId();

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var methodUsage = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .GroupBy(u => u.Method)
            .Select(g => new
            {
                method = g.Key,
                requests = g.Count()
            })
            .OrderByDescending(m => m.requests)
            .ToListAsync();

        var result = methodUsage.Select(m => new
        {
            method = m.method.ToString(),
            m.requests
        });

        return Ok(result);
    }

    [HttpGet("status-codes")]
    public async Task<IActionResult> GetStatusCodeDistribution()
    {
        var userId = GetUserId();

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var statusCodes = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .GroupBy(u => u.StatusCode)
            .Select(g => new
            {
                statusCode = g.Key,
                count = g.Count()
            })
            .OrderByDescending(s => s.count)
            .ToListAsync();

        return Ok(statusCodes);
    }

    [HttpGet("rate-limit")]
    public async Task<IActionResult> GetRateLimitUsage()
    {
        var userId = GetUserId();

        var user = await _context.Set<User>()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var apiKeyIds = await _context.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId && k.IsActive)
            .Select(k => k.Id)
            .ToListAsync();

        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var currentUsage = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= oneHourAgo)
            .CountAsync();

        var maxRequests = user.IsAdmin ? 99999 : Constants.TierConstants.GetRateLimit(user.Tier);

        var now = DateTime.UtcNow;
        var currentMinute = now.Minute;
        var nextHourReset = now.AddHours(1).AddMinutes(-currentMinute).AddSeconds(-now.Second).AddMilliseconds(-now.Millisecond);
        var minutesUntilReset = (int)(nextHourReset - now).TotalMinutes;
        var secondsUntilReset = (int)(nextHourReset - now).TotalSeconds;

        var usagePercent = maxRequests > 0 ? Math.Round((double)currentUsage / maxRequests * 100, 2) : 0;

        var oldestRequest = await _context.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= oneHourAgo)
            .OrderBy(u => u.RequestedAt)
            .Select(u => u.RequestedAt)
            .FirstOrDefaultAsync();

        DateTime resetTime;
        if (oldestRequest != default)
        {
            resetTime = oldestRequest.AddHours(1);
        }
        else
        {
            resetTime = nextHourReset;
        }

        return Ok(new
        {
            current = currentUsage,
            max = maxRequests,
            remaining = Math.Max(0, maxRequests - currentUsage),
            usagePercent,
            resetTime,
            minutesUntilReset,
            secondsUntilReset,
            isNearLimit = usagePercent >= 80,
            isOverLimit = currentUsage >= maxRequests,
            tier = user.Tier.ToString()
        });
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
