using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using System.Security.Claims;
using System.Text.Json;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/users/me/usage")]
[Authorize]
public class UsageController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;
    private readonly IDistributedCache _cache;
    private static readonly TimeSpan HourlyWindowDuration = TimeSpan.FromHours(1);

    public UsageController(IServiceScopeFactory serviceScopeFactory, ILogger logger, IDistributedCache cache)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<UsageController>();
        _cache = cache;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetUsageSummary()
    {
        var userId = GetUserId();

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var totalRequests = await db.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .CountAsync();

        var last30DaysRequests = await db.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= DateTime.UtcNow.AddDays(-30))
            .CountAsync();

        var averageResponseTime = await db.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .AverageAsync(u => (double?)u.ResponseTimeMs) ?? 0;

        var successRate = await db.Set<ApiKeyUsage>()
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
            ? (double)successRate.successful / successRate.total * Constants.RateLimitConstants.PercentageMultiplier
            : 100.0;

        return Ok(new
        {
            totalRequests,
            last30DaysRequests,
            averageResponseTime = Math.Round(averageResponseTime, Constants.RateLimitConstants.DecimalPlacesForRounding),
            successRate = Math.Round(successRatePercent, Constants.RateLimitConstants.DecimalPlacesForRounding)
        });
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyUsage([FromQuery] int days = 30)
    {
        var userId = GetUserId();

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        if (days < 1 || days > 90)
            days = 30;

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        var dailyUsage = await db.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId) && u.RequestedAt >= startDate)
            .GroupBy(u => u.RequestedAt.Date)
            .Select(g => new
            {
                date = g.Key,
                requests = g.Count(),
                averageResponseTime = g.Average(u => u.ResponseTimeMs),
                errors = g.Count(u => u.StatusCode >= 500)
            })
            .OrderBy(d => d.date)
            .ToListAsync();

        var dailyUsageDict = dailyUsage.ToDictionary(
            d => new DateTime(d.date.Year, d.date.Month, d.date.Day, 0, 0, 0, DateTimeKind.Utc),
            d => d
        );

        var allDates = Enumerable.Range(0, days)
            .Select(i => startDate.AddDays(i))
            .Select(date => new
            {
                date,
                requests = dailyUsageDict.TryGetValue(date, out var usage) ? usage.requests : 0,
                averageResponseTime = dailyUsageDict.TryGetValue(date, out var usageForAvg) ? usageForAvg.averageResponseTime : 0,
                errors = dailyUsageDict.TryGetValue(date, out var usageForErrors) ? usageForErrors.errors : 0
            })
            .ToList();

        return Ok(allDates);
    }

    [HttpGet("endpoints")]
    public async Task<IActionResult> GetEndpointUsage()
    {
        var userId = GetUserId();

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var endpointUsage = await db.Set<ApiKeyUsage>()
            .AsNoTracking()
            .Where(u => apiKeyIds.Contains(u.ApiKeyId))
            .GroupBy(u => new { u.EndpointId, u.Endpoint.Path })
            .Select(g => new
            {
                endpoint = g.Key.Path,
                requests = g.Count(),
                averageResponseTime = Math.Round(g.Average(u => u.ResponseTimeMs), Constants.RateLimitConstants.DecimalPlacesForRounding),
                errors = g.Count(u => u.StatusCode >= 500)
            })
            .OrderByDescending(e => e.requests)
            .Take(10)
            .ToListAsync();

        return Ok(endpointUsage);
    }

    [HttpGet("methods")]
    public async Task<IActionResult> GetMethodUsage()
    {
        var userId = GetUserId();

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var methodUsage = await db.Set<ApiKeyUsage>()
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

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .Select(k => k.Id)
            .ToListAsync();

        var statusCodes = await db.Set<ApiKeyUsage>()
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
        return await GetRateLimitUsageV2();
    }

    [HttpGet("rate-limit-v2")]
    public async Task<IActionResult> GetRateLimitUsageV2()
    {
        var userId = GetUserId();

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await db.Set<User>()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var apiKeyIds = await db.Set<ApiKey>()
            .AsNoTracking()
            .Where(k => k.UserId == userId && k.IsActive)
            .Select(k => k.Id)
            .ToListAsync();

        var isAdmin = user.IsAdmin;
        var tier = user.Tier;

        var operationLimits = new List<object>();

        foreach (var operationTier in Constants.TierConstants.AllOperationTiers)
        {
            var limit = isAdmin ? Constants.TierConstants.RateLimitAdmin : Constants.TierConstants.GetOperationRateLimit(tier, operationTier);

            var cacheKey = string.Format(Constants.RateLimitConstants.CacheKeyUserFormat, operationTier.ToString().ToLowerInvariant(), userId);
            var requestLogBytes = await _cache.GetAsync(cacheKey);
            var requestLog = requestLogBytes != null
                ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? new List<DateTime>()
                : new List<DateTime>();

            var cutoffTime = DateTime.UtcNow.Subtract(HourlyWindowDuration);
            var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();
            var current = recentRequests.Count;
            var remaining = Math.Max(0, limit - current);
            var usagePercent = limit > 0
                ? Math.Round((double)current / limit * Constants.RateLimitConstants.PercentageMultiplier, Constants.RateLimitConstants.DecimalPlacesForRounding)
                : 0;

            DateTime resetTime;
            if (recentRequests.Count > 0)
            {
                var oldestRequest = recentRequests.Min();
                resetTime = oldestRequest.Add(HourlyWindowDuration);
            }
            else
            {
                resetTime = DateTime.UtcNow.Add(HourlyWindowDuration);
            }

            operationLimits.Add(new
            {
                operation = operationTier.ToString(),
                current,
                limit,
                remaining,
                usagePercent,
                resetTime,
                isNearLimit = usagePercent >= Constants.RateLimitConstants.NearLimitThresholdPercent,
                isOverLimit = current >= limit
            });
        }

        return Ok(new
        {
            tier = (int)tier,
            tierName = tier.ToString(),
            isAdmin,
            hasApiKeys = apiKeyIds.Count > 0,
            operations = operationLimits
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