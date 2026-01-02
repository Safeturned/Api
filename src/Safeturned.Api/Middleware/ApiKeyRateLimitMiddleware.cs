using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;

namespace Safeturned.Api.Middleware;

public class ApiKeyRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger _logger;
    private readonly IServiceProvider _serviceProvider;

    private static readonly TimeSpan HourlyWindowDuration = TimeSpan.FromHours(1);

    public ApiKeyRateLimitMiddleware(RequestDelegate next, IDistributedCache cache, ILogger logger, IServiceProvider serviceProvider)
    {
        _next = next;
        _cache = cache;
        _logger = logger.ForContext<ApiKeyRateLimitMiddleware>();
        _serviceProvider = serviceProvider;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Method == "OPTIONS")
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (!IsApiRoute(path))
        {
            await _next(context);
            return;
        }

        if (!ShouldRateLimit(context, path))
        {
            _logger.Debug("Skipping rate limit for dashboard route: {Path}, Method: {Method}",
                context.Request.Path, context.Request.Method);
            await _next(context);
            return;
        }

        try
        {
            var operationTier = GetOperationTier(context);

            var isApiKeyAuth = context.User.Identity?.IsAuthenticated == true &&
                              context.User.Identity.AuthenticationType == AuthConstants.ApiKeyScheme;

            var isAuthenticated = context.User.Identity?.IsAuthenticated == true;

            _logger.Debug("Rate limit check for path {Path}: IsApiKeyAuth={IsApiKeyAuth}, IsAuthenticated={IsAuth}, AuthType={AuthType}",
                context.Request.Path, isApiKeyAuth, isAuthenticated, context.User.Identity?.AuthenticationType);

            if (isApiKeyAuth)
            {
                _logger.Debug("Rate limiting API Key auth for path {Path}, tier: {Tier}", context.Request.Path, operationTier);
                await HandleApiKeyRateLimitAsync(context, operationTier);
            }
            else if (isAuthenticated)
            {
                _logger.Debug("Rate limiting authenticated user for path {Path}, tier: {Tier}, authType: {AuthType}",
                    context.Request.Path, operationTier, context.User.Identity?.AuthenticationType);
                await HandleUserRateLimitAsync(context, operationTier);
            }
            else
            {
                _logger.Debug("Rate limiting Guest for path {Path}, tier: {Tier}", context.Request.Path, operationTier);
                await HandleGuestRateLimitAsync(context, operationTier);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error in rate limiting middleware for path {Path}", context.Request.Path);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error in rate limiting middleware"));

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Internal server error",
                message = "An error occurred while processing your request. Please try again later."
            });
        }
    }

    private static bool IsApiRoute(string path)
    {
        if (!path.StartsWith("/v1.0/") && !path.StartsWith("/v2.0/"))
        {
            return false;
        }

        return true;
    }

    private static bool ShouldRateLimit(HttpContext context, string path)
    {
        var method = context.Request.Method.ToUpperInvariant();
        var isApiKeyAuth = context.User.Identity?.IsAuthenticated == true && context.User.Identity.AuthenticationType == AuthConstants.ApiKeyScheme;
        if (isApiKeyAuth)
        {
            return true;
        }
        if ((path.StartsWith("/v1.0/files") || path.StartsWith("/v2.0/files")) && (method == "POST" || method == "PUT"))
        {
            return true;
        }
        return false;
    }

    private static RateLimitTier GetOperationTier(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        var method = context.Request.Method.ToUpperInvariant();

        if (path.StartsWith("/v1.0/exception") || path.StartsWith("/v2.0/exception"))
        {
            return RateLimitTier.Exceptions;
        }

        if (((path.StartsWith("/v1.0/files") || path.StartsWith("/v2.0/files")) ||
             (path.Contains("/upload") && path.Contains("/files"))) &&
            (method == "POST" || method == "PUT"))
        {
            return RateLimitTier.FilesUpload;
        }

        if (method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH")
        {
            return RateLimitTier.Write;
        }

        return RateLimitTier.Read;
    }

    private async Task HandleApiKeyRateLimitAsync(HttpContext context, RateLimitTier operationTier)
    {
        var apiKeyId = context.User.FindFirst(AuthConstants.ApiKeyIdClaim)?.Value;
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? context.User.FindFirst(AuthConstants.SubClaim)?.Value;
        if (string.IsNullOrEmpty(apiKeyId) || string.IsNullOrEmpty(userId))
        {
            _logger.Warning("API key authentication missing required claims, falling back to guest rate limit");
            await HandleGuestRateLimitAsync(context, operationTier);
            return;
        }

        var tier = context.User.GetTier();
        var isAdmin = context.User.FindFirst(AuthConstants.IsAdminClaim)?.Value == "true";
        var rateLimit = isAdmin ? TierConstants.RateLimitAdmin : TierConstants.GetOperationRateLimit(tier, operationTier);

        if (tier == TierType.Bot && operationTier != RateLimitTier.Read)
        {
            var burstKey = $"{RateLimitConstants.CacheKeyBurstPrefix}:{userId}";
            var burstLogBytes = await _cache.GetAsync(burstKey);
            var burstLog = burstLogBytes != null
                ? JsonSerializer.Deserialize<List<DateTime>>(burstLogBytes) ?? []
                : [];

            var burstCutoff = DateTime.UtcNow.Subtract(TierConstants.BotBurstWindow);
            var recentBurstRequests = burstLog.Where(time => time > burstCutoff).ToList();

            if (recentBurstRequests.Count >= TierConstants.BotBurstLimit)
            {
                _logger.Warning("Bot tier burst limit exceeded for user {UserId}. {Count} requests in 1 minute (limit: {Limit})",
                    userId, recentBurstRequests.Count, TierConstants.BotBurstLimit);

                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.ContentType = "application/json";

                var retryAfter = Math.Max(1, (int)recentBurstRequests.Min().Add(TierConstants.BotBurstWindow).Subtract(DateTime.UtcNow).TotalSeconds);

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
                    window = "1 minute",
                    operationTier = operationTier.ToString()
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

        var cacheKey = string.Format(RateLimitConstants.CacheKeyUserFormat, operationTier.ToString().ToLowerInvariant(), userId);
        var requestLogBytes = await _cache.GetAsync(cacheKey);
        var requestLog = requestLogBytes != null
            ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? []
            : [];

        var cutoffTime = DateTime.UtcNow.Subtract(HourlyWindowDuration);
        var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();

        if (recentRequests.Count >= rateLimit)
        {
            _logger.Warning("Rate limit exceeded for user {UserId}. Limit: {RateLimit}/hour, Tier: {Tier}, Operation: {Operation}",
                userId, rateLimit, tier, operationTier);

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";

            var oldestRequest = recentRequests.Min();
            var retryAfter = Math.Max(1, (int)oldestRequest.Add(HourlyWindowDuration).Subtract(DateTime.UtcNow).TotalSeconds);

            context.Response.Headers.RetryAfter = retryAfter.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = "0";
            context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(oldestRequest.Add(HourlyWindowDuration)).ToUnixTimeSeconds().ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = $"You have exceeded the {operationTier.ToString().ToLowerInvariant()} operation rate limit of {rateLimit} requests per hour for {tier} tier.",
                retryAfter = retryAfter,
                limit = rateLimit,
                remaining = 0,
                operationTier = operationTier.ToString(),
                userTier = tier.ToString()
            });

            return;
        }

        recentRequests.Add(DateTime.UtcNow);
        var requestLogJson = JsonSerializer.SerializeToUtf8Bytes(recentRequests);
        await _cache.SetAsync(cacheKey, requestLogJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = HourlyWindowDuration
        });

        var remaining = rateLimit - recentRequests.Count;
        var resetTime = recentRequests.Count > 0 ? recentRequests.Min().Add(HourlyWindowDuration) : DateTime.UtcNow.Add(HourlyWindowDuration);

        var clientTag = context.Request.Headers[AuthConstants.ClientHeader].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(clientTag) && clientTag.Length > ClientConstants.MaxClientTagLength)
        {
            clientTag = clientTag[..ClientConstants.MaxClientTagLength];
        }

        var startTimestamp = Stopwatch.GetTimestamp();

        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, remaining).ToString();
            context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(resetTime).ToUnixTimeSeconds().ToString();
            context.Response.Headers["X-RateLimit-Tier"] = operationTier.ToString();
            return Task.CompletedTask;
        });

        await _next(context);

        if (Guid.TryParse(apiKeyId, out var apiKeyGuid))
        {
            var elapsedMs = (int)Stopwatch.GetElapsedTime(startTimestamp).TotalMilliseconds;
            var clientIp = context.GetIPAddress();

            using var scope = _serviceProvider.CreateScope();
            var apiKeyService = scope.ServiceProvider.GetService<IApiKeyService>();

            if (apiKeyService != null)
            {
                await apiKeyService.LogApiKeyUsageAsync(
                    apiKeyGuid,
                    context.Request.Path,
                    context.Request.Method,
                    context.Response.StatusCode,
                    elapsedMs,
                    clientIp,
                    clientTag);
            }
        }
    }

    private async Task HandleUserRateLimitAsync(HttpContext context, RateLimitTier operationTier)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? context.User.FindFirst(AuthConstants.SubClaim)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            await HandleGuestRateLimitAsync(context, operationTier);
            return;
        }

        var tier = context.User.GetTier();
        var isAdmin = context.User.FindFirst(AuthConstants.IsAdminClaim)?.Value == "true";
        var rateLimit = isAdmin ? TierConstants.RateLimitAdmin : TierConstants.GetOperationRateLimit(tier, operationTier);

        _logger.Debug("User {UserId} authenticated with tier {Tier}, operation {Operation}, limit: {RateLimit}/hour",
            userId, tier, operationTier, rateLimit);

        var cacheKey = string.Format(RateLimitConstants.CacheKeyUserFormat, operationTier.ToString().ToLowerInvariant(), userId);

        var requestLogBytes = await _cache.GetAsync(cacheKey);
        var requestLog = requestLogBytes != null
            ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? []
            : [];

        var cutoffTime = DateTime.UtcNow.Subtract(HourlyWindowDuration);
        var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();

        if (recentRequests.Count >= rateLimit)
        {
            _logger.Warning("Rate limit exceeded for user {UserId}. Limit: {RateLimit}/hour, Tier: {Tier}, Operation: {Operation}",
                userId, rateLimit, tier, operationTier);

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";

            var oldestRequest = recentRequests.Min();
            var retryAfter = Math.Max(1, (int)oldestRequest.Add(HourlyWindowDuration).Subtract(DateTime.UtcNow).TotalSeconds);

            context.Response.Headers.RetryAfter = retryAfter.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = "0";
            context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(oldestRequest.Add(HourlyWindowDuration)).ToUnixTimeSeconds().ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = $"You have exceeded the {operationTier.ToString().ToLowerInvariant()} operation rate limit of {rateLimit} requests per hour.",
                retryAfter = retryAfter,
                limit = rateLimit,
                remaining = 0,
                operationTier = operationTier.ToString(),
                userTier = tier.ToString()
            });

            return;
        }

        recentRequests.Add(DateTime.UtcNow);
        var requestLogJson = JsonSerializer.SerializeToUtf8Bytes(recentRequests);
        await _cache.SetAsync(cacheKey, requestLogJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = HourlyWindowDuration
        });

        var remaining = rateLimit - recentRequests.Count;
        var resetTime = recentRequests.Count > 0 ? recentRequests.Min().Add(HourlyWindowDuration) : DateTime.UtcNow.Add(HourlyWindowDuration);

        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, remaining).ToString();
            context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(resetTime).ToUnixTimeSeconds().ToString();
            context.Response.Headers["X-RateLimit-Tier"] = operationTier.ToString();
            return Task.CompletedTask;
        });

        await _next(context);
    }

    private async Task HandleGuestRateLimitAsync(HttpContext context, RateLimitTier operationTier)
    {
        var clientIp = context.GetIPAddress();
        var rateLimit = TierConstants.GetGuestOperationRateLimit(operationTier);
        var cacheKey = string.Format(RateLimitConstants.CacheKeyGuestFormat, operationTier.ToString().ToLowerInvariant(), clientIp);

        var requestLogBytes = await _cache.GetAsync(cacheKey);
        var requestLog = requestLogBytes != null
            ? JsonSerializer.Deserialize<List<DateTime>>(requestLogBytes) ?? []
            : [];

        var cutoffTime = DateTime.UtcNow.Subtract(HourlyWindowDuration);
        var recentRequests = requestLog.Where(time => time > cutoffTime).ToList();

        if (recentRequests.Count >= rateLimit)
        {
            _logger.Warning("Rate limit exceeded for guest IP {ClientIp}. {Count} requests in 1 hour (limit: {Limit}), operation: {Operation}",
                clientIp, recentRequests.Count, rateLimit, operationTier);

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";

            var oldestRequest = recentRequests.Min();
            var retryAfter = Math.Max(1, (int)oldestRequest.Add(HourlyWindowDuration).Subtract(DateTime.UtcNow).TotalSeconds);

            context.Response.Headers.RetryAfter = retryAfter.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = "0";

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = $"You have exceeded the {operationTier.ToString().ToLowerInvariant()} operation rate limit. Sign up for a free account to increase your limits.",
                retryAfter = retryAfter,
                limit = rateLimit,
                window = "1 hour",
                operationTier = operationTier.ToString(),
                suggestion = "Sign up for a free account (one per user) to get higher limits: 2000 reads/hour, 150 writes/hour, 30 file uploads/hour"
            });

            return;
        }

        recentRequests.Add(DateTime.UtcNow);
        var requestLogJson = JsonSerializer.SerializeToUtf8Bytes(recentRequests);
        await _cache.SetAsync(cacheKey, requestLogJson, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = HourlyWindowDuration
        });

        var remaining = rateLimit - recentRequests.Count;
        var resetTime = recentRequests.Count > 0 ? recentRequests.Min().Add(HourlyWindowDuration) : DateTime.UtcNow.Add(HourlyWindowDuration);

        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-RateLimit-Limit"] = rateLimit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, remaining).ToString();
            context.Response.Headers["X-RateLimit-Reset"] = new DateTimeOffset(resetTime).ToUnixTimeSeconds().ToString();
            context.Response.Headers["X-RateLimit-Tier"] = operationTier.ToString();
            return Task.CompletedTask;
        });

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
