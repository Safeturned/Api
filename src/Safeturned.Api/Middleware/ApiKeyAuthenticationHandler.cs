using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;

namespace Safeturned.Api.Middleware;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<ApiKeyAuthenticationHandler> _logger;
    private readonly IDistributedCache _cache;

    private static readonly int MaxFailedAttempts = 10;
    private static readonly TimeSpan FailedAttemptWindow = TimeSpan.FromMinutes(5);

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory loggerFactory,
        UrlEncoder encoder,
        IApiKeyService apiKeyService,
        IDistributedCache cache)
        : base(options, loggerFactory, encoder)
    {
        _apiKeyService = apiKeyService;
        _logger = loggerFactory.CreateLogger<ApiKeyAuthenticationHandler>();
        _cache = cache;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? apiKey = null;

        if (Request.Headers.ContainsKey(AuthConstants.ApiKeyHeader))
        {
            apiKey = Request.Headers[AuthConstants.ApiKeyHeader].ToString().Trim();
        }
        else if (Request.Headers.ContainsKey(AuthConstants.AuthorizationHeader))
        {
            string authorizationHeader = Request.Headers[AuthConstants.AuthorizationHeader].ToString();

            if (authorizationHeader.StartsWith($"{AuthConstants.BearerScheme} ", StringComparison.OrdinalIgnoreCase))
            {
                apiKey = authorizationHeader.Substring($"{AuthConstants.BearerScheme} ".Length).Trim();
            }
        }

        if (string.IsNullOrEmpty(apiKey))
        {
            return AuthenticateResult.NoResult();
        }

        if (!ApiKeyHelper.HasValidPrefix(apiKey))
        {
            return AuthenticateResult.NoResult();
        }

        var clientIp = Request.HttpContext.GetIPAddress();

        var failKey = string.Format(RateLimitConstants.AuthFailCacheKeyFormat, clientIp);
        var failDataBytes = await _cache.GetAsync(failKey);
        List<DateTime> failLog = [];

        if (failDataBytes != null)
        {
            failLog = JsonSerializer.Deserialize<List<DateTime>>(failDataBytes) ?? [];
            var cutoffTime = DateTime.UtcNow.Subtract(FailedAttemptWindow);
            failLog = failLog.Where(time => time > cutoffTime).ToList();

            if (failLog.Count >= MaxFailedAttempts)
            {
                _logger.LogWarning("Too many failed authentication attempts from IP {ClientIp}: {Count} failures in 5 minutes",
                    clientIp, failLog.Count);

                var oldestFail = failLog.Min();
                var retryAfter = (int)oldestFail.Add(FailedAttemptWindow).Subtract(DateTime.UtcNow).TotalSeconds;

                Context.Response.Headers.RetryAfter = Math.Max(1, retryAfter).ToString();

                return AuthenticateResult.Fail($"Too many failed authentication attempts. Retry after {Math.Max(1, retryAfter)} seconds.");
            }
        }

        var validatedKey = await _apiKeyService.ValidateApiKeyAsync(apiKey, clientIp);

        if (validatedKey == null)
        {
            _logger.LogWarning("Invalid API key attempted from IP {ClientIp}", clientIp);

            failLog.Add(DateTime.UtcNow);
            var failLogJson = JsonSerializer.SerializeToUtf8Bytes(failLog);
            await _cache.SetAsync(failKey, failLogJson, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = FailedAttemptWindow
            });

            return AuthenticateResult.Fail("Invalid or expired API key");
        }

        if (failLog.Count > 0)
        {
            await _cache.RemoveAsync(failKey);
        }

        // Update last used timestamp (fire and forget)
        _ = _apiKeyService.UpdateLastUsedAsync(validatedKey.Id);

        var userTier = validatedKey.User?.Tier ?? TierType.Free;
        var scopesArray = ApiKeyScopeHelper.ScopesToArray(validatedKey.Scopes);

        List<Claim> claims =
        [
            new Claim(ClaimTypes.NameIdentifier, validatedKey.UserId.ToString()),
            new Claim(AuthConstants.ApiKeyIdClaim, validatedKey.Id.ToString()),
            new Claim(AuthConstants.TierClaim, ((int)userTier).ToString()),
            new Claim(AuthConstants.ScopesClaim, string.Join(",", scopesArray))
        ];

        if (validatedKey.User != null)
        {
            // Email is optional (Steam users don't have email)
            if (!string.IsNullOrEmpty(validatedKey.User.Email))
            {
                claims.Add(new Claim(ClaimTypes.Email, validatedKey.User.Email));
            }

            claims.Add(new Claim(AuthConstants.PermissionsClaim, ((int)validatedKey.User.Permissions).ToString()));
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        _logger.LogInformation("API key {ApiKeyId} authenticated for user {UserId} with scheme {Scheme}, tier {Tier}",
            validatedKey.Id, validatedKey.UserId, Scheme.Name, (int)userTier);

        return AuthenticateResult.Success(ticket);
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        Response.ContentType = "application/json";

        var errorResponse = new
        {
            error = "Unauthorized",
            message = "Valid API key required. Use 'X-API-Key: sk_live_...' or 'Authorization: Bearer sk_live_...' header."
        };

        return Response.WriteAsJsonAsync(errorResponse);
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        Response.ContentType = "application/json";

        var errorResponse = new
        {
            error = "Forbidden",
            message = "Your API key does not have permission to access this resource."
        };

        return Response.WriteAsJsonAsync(errorResponse);
    }
}

public class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string DefaultScheme = AuthConstants.ApiKeyScheme;
}