using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using System.Security.Claims;
using System.Text.Json;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/usage")]
[Authorize(AuthenticationSchemes = AuthConstants.ApiKeyScheme)]
public class ApiKeyUsageController : ControllerBase
{
    private readonly IDistributedCache _cache;
    private static readonly TimeSpan HourlyWindowDuration = TimeSpan.FromHours(1);

    public ApiKeyUsageController(IDistributedCache cache)
    {
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsage()
    {
        var userId = GetUserId();
        var tier = User.GetTier();
        var isAdmin = UserPermissionHelper.IsAdministrator(User);

        var limit = isAdmin
            ? TierConstants.RateLimitAdmin
            : TierConstants.GetOperationRateLimit(tier, RateLimitTier.FilesUpload);

        var cacheKey = string.Format(
            RateLimitConstants.CacheKeyUserFormat,
            RateLimitTier.FilesUpload.ToString().ToLowerInvariant(),
            userId);

        var requestLogBytes = await _cache.GetAsync(cacheKey);
        var requestLog = requestLogBytes != null
            ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? []
            : [];

        var cutoffTime = DateTime.UtcNow.Subtract(HourlyWindowDuration);
        var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();
        var used = recentRequests.Count;

        DateTime resetAt;
        if (recentRequests.Count > 0)
        {
            var oldestRequest = recentRequests.Min();
            resetAt = oldestRequest.Add(HourlyWindowDuration);
        }
        else
        {
            resetAt = DateTime.UtcNow.Add(HourlyWindowDuration);
        }

        return Ok(new
        {
            tier = tier.ToString(),
            requestsUsed = used,
            requestsLimit = limit,
            resetAt
        });
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user ID");
        }

        return userId;
    }
}
