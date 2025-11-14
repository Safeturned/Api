using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Middleware;

public class ApiKeyRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger _logger;

    private static readonly TimeSpan WindowDuration = TimeSpan.FromHours(1);

    public ApiKeyRateLimitMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        ILogger logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger.ForContext<ApiKeyRateLimitMiddleware>();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.Identity.AuthenticationType == "ApiKey")
        {
            var apiKeyId = context.User.FindFirst("api_key_id")?.Value;
            var rateLimitStr = context.User.FindFirst("rate_limit")?.Value;
            var tierStr = context.User.FindFirst("tier")?.Value;

            if (string.IsNullOrEmpty(apiKeyId) || string.IsNullOrEmpty(rateLimitStr))
            {
                _logger.Warning("API key authentication missing required claims");
                await _next(context);
                return;
            }

            var isBotTier = tierStr == TierConstants.TierBot.ToString();
            var rateLimit = isBotTier ? TierConstants.RateLimitBot : int.TryParse(rateLimitStr, out var limit) ? limit : TierConstants.RateLimitFree;

            if (isBotTier)
            {
                var burstKey = $"ratelimit:burst:{apiKeyId}";
                var burstLogBytes = await _cache.GetAsync(burstKey);
                var burstLog = burstLogBytes != null
                    ? JsonSerializer.Deserialize<List<DateTime>>(burstLogBytes) ?? []
                    : [];

                var burstCutoff = DateTime.UtcNow.Subtract(TierConstants.BotBurstWindow);
                var recentBurstRequests = burstLog.Where(time => time > burstCutoff).ToList();

                if (recentBurstRequests.Count >= TierConstants.BotBurstLimit)
                {
                    _logger.Warning("Bot tier burst limit exceeded for API key {ApiKeyId}. {Count} requests in 1 minute (limit: {Limit})",
                        apiKeyId, recentBurstRequests.Count, TierConstants.BotBurstLimit);

                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.ContentType = "application/json";

                    var retryAfter = (int)recentBurstRequests.Min().Add(TierConstants.BotBurstWindow).Subtract(DateTime.UtcNow).TotalSeconds;

                    context.Response.Headers.RetryAfter = retryAfter.ToString();
                    context.Response.Headers["X-RateLimit-Limit"] = TierConstants.BotBurstLimit.ToString();
                    context.Response.Headers["X-RateLimit-Remaining"] = "0";

                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Rate limit exceeded",
                        message = $"Bot tier burst limit exceeded. Maximum {TierConstants.BotBurstLimit} requests per minute.",
                        retryAfter = retryAfter,
                        limit = TierConstants.BotBurstLimit,
                        remaining = 0,
                        window = "1 minute"
                    });

                    return;
                }

                recentBurstRequests.Add(DateTime.UtcNow);
                var burstLogJson = JsonSerializer.SerializeToUtf8Bytes(recentBurstRequests);
                await _cache.SetAsync(burstKey, burstLogJson, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TierConstants.BotBurstWindow
                });
            }

            var cacheKey = $"ratelimit:hourly:{apiKeyId}";
            var requestLogBytes = await _cache.GetAsync(cacheKey);
            var requestLog = requestLogBytes != null
                ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? []
                : [];

            var cutoffTime = DateTime.UtcNow.Subtract(WindowDuration);
            var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();

            if (recentRequests.Count >= rateLimit)
            {
                _logger.Warning("Rate limit exceeded for API key {ApiKeyId}. Limit: {RateLimit}/hour, Tier: {Tier}",
                    apiKeyId, rateLimit, isBotTier ? "Bot" : tierStr ?? "Free");

                if (isBotTier && recentRequests.Count > TierConstants.RateLimitBot * 1.5)
                {
                    _logger.Error("ABUSE DETECTED: Bot tier API key {ApiKeyId} exceeded 150% of hourly limit ({Count} requests)",
                        apiKeyId, recentRequests.Count);
                }

                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.ContentType = "application/json";

                var oldestRequest = recentRequests.Min();
                var retryAfter = (int)oldestRequest.Add(WindowDuration).Subtract(DateTime.UtcNow).TotalSeconds;

                context.Response.Headers.RetryAfter = retryAfter.ToString();
                context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
                context.Response.Headers["X-RateLimit-Remaining"] = "0";
                context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(oldestRequest.Add(WindowDuration)).ToUnixTimeSeconds().ToString();

                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Rate limit exceeded",
                    message = $"You have exceeded the rate limit of {rateLimit} requests per hour.",
                    retryAfter = retryAfter,
                    limit = rateLimit,
                    remaining = 0
                });

                return;
            }

            recentRequests.Add(DateTime.UtcNow);
            var requestLogJson = JsonSerializer.SerializeToUtf8Bytes(recentRequests);
            await _cache.SetAsync(cacheKey, requestLogJson, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = WindowDuration
            });

            var remaining = rateLimit - recentRequests.Count;
            var resetTime = DateTime.UtcNow.Add(WindowDuration);

            context.Response.OnStarting(() =>
            {
                context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
                context.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, remaining).ToString();
                context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(resetTime).ToUnixTimeSeconds().ToString();
                return Task.CompletedTask;
            });
        }

        await _next(context);
    }
}

public static class ApiKeyRateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UseApiKeyRateLimit(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ApiKeyRateLimitMiddleware>();
    }
}