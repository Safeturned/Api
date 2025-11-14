using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Safeturned.Api.Constants;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;

namespace Safeturned.Api.Middleware;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<ApiKeyAuthenticationHandler> _logger;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory loggerFactory,
        UrlEncoder encoder,
        IApiKeyService apiKeyService)
        : base(options, loggerFactory, encoder)
    {
        _apiKeyService = apiKeyService;
        _logger = loggerFactory.CreateLogger<ApiKeyAuthenticationHandler>();
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.ContainsKey("Authorization"))
        {
            return AuthenticateResult.NoResult();
        }

        string authorizationHeader = Request.Headers["Authorization"].ToString();

        if (!authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var apiKey = authorizationHeader.Substring("Bearer ".Length).Trim();

        if (!apiKey.StartsWith(ApiKeyConstants.LivePrefix) && !apiKey.StartsWith(ApiKeyConstants.TestPrefix))
        {
            return AuthenticateResult.NoResult();
        }

        var clientIp = Request.HttpContext.GetIPAddress();
        var validatedKey = await _apiKeyService.ValidateApiKeyAsync(apiKey, clientIp);

        if (validatedKey == null)
        {
            _logger.LogWarning("Invalid API key attempted from IP {ClientIp}", clientIp);
            return AuthenticateResult.Fail("Invalid or expired API key");
        }

        // Update last used timestamp (fire and forget)
        _ = _apiKeyService.UpdateLastUsedAsync(validatedKey.Id);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, validatedKey.UserId.ToString()),
            new Claim("api_key_id", validatedKey.Id.ToString()),
            new Claim("tier", validatedKey.RateLimitTier.ToString()),
            new Claim("rate_limit", validatedKey.RequestsPerHour.ToString()),
            new Claim("scopes", validatedKey.Scopes)
        };

        if (validatedKey.User != null)
        {
            claims.Add(new Claim(ClaimTypes.Email, validatedKey.User.Email));

            if (validatedKey.User.IsAdmin)
            {
                claims.Add(new Claim("is_admin", "true"));
            }
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        _logger.LogInformation("API key {ApiKeyId} authenticated for user {UserId}",
            validatedKey.Id, validatedKey.UserId);

        return AuthenticateResult.Success(ticket);
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        Response.ContentType = "application/json";

        var errorResponse = new
        {
            error = "Unauthorized",
            message = "Valid API key required. Use 'Authorization: Bearer sk_live_...' header."
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
    public const string DefaultScheme = "ApiKey";
}