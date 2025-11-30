using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Asp.Versioning;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;
using Sentry;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private readonly ITokenService _tokenService;
    private readonly IDiscordAuthService _discordAuthService;
    private readonly ISteamAuthService _steamAuthService;
    private readonly ILogger _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthController(
        ITokenService tokenService,
        IDiscordAuthService discordAuthService,
        ISteamAuthService steamAuthService,
        ILogger logger,
        IServiceScopeFactory serviceScopeFactory,
        IWebHostEnvironment environment,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _tokenService = tokenService;
        _discordAuthService = discordAuthService;
        _steamAuthService = steamAuthService;
        _logger = logger.ForContext<AuthController>();
        _serviceScopeFactory = serviceScopeFactory;
        _environment = environment;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("discord")]
    public IActionResult DiscordLogin([FromQuery] string returnUrl = "/")
    {
        returnUrl = ValidateAndSanitizeReturnUrl(returnUrl);
        _logger.Information("Discord login initiated with returnUrl: {ReturnUrl}", returnUrl);

        var clientId = _configuration.GetRequiredString("Discord:ClientId");
        var frontendUrl = _configuration.GetRequiredString("Frontend:Url");
        var callbackUrl = $"{frontendUrl}/auth/callback";

        // Build state parameter with returnUrl (don't double-encode - state will be encoded once by the URL)
        var stateGuid = Guid.NewGuid().ToString();
        var state = $"{stateGuid}|{returnUrl}";
        
        // Build Discord OAuth URL manually
        var redirectUri = Uri.EscapeDataString(callbackUrl);
        var scope = Uri.EscapeDataString("identify email");
        var encodedState = Uri.EscapeDataString(state);
        var discordAuthUrl = $"https://discord.com/api/oauth2/authorize?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&scope={scope}&state={encodedState}";

        _logger.Information("Redirecting to Discord OAuth with callback: {CallbackUrl}", callbackUrl);
        return Redirect(discordAuthUrl);
    }

    [HttpGet("steam")]
    public IActionResult SteamLogin([FromQuery] string returnUrl = "/")
    {
        returnUrl = ValidateAndSanitizeReturnUrl(returnUrl);
        _logger.Information("Steam login initiated with returnUrl: {ReturnUrl}", returnUrl);

        var frontendUrl = _configuration.GetRequiredString("Frontend:Url");
        var callbackUrl = $"{frontendUrl}/auth/callback";

        // Build state parameter with returnUrl (don't double-encode - state will be encoded once by the URL)
        var stateGuid = Guid.NewGuid().ToString();
        var state = $"{stateGuid}|{returnUrl}";
        
        // Build Steam OpenID URL manually
        var returnTo = Uri.EscapeDataString($"{callbackUrl}?state={Uri.EscapeDataString(state)}");
        var realm = Uri.EscapeDataString(frontendUrl);
        var steamAuthUrl = $"https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to={returnTo}&openid.realm={realm}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select&openid.ns.sreg=http://openid.net/extensions/sreg/1.1&openid.sreg.optional=nickname,email,fullname";

        _logger.Information("Redirecting to Steam OpenID with callback: {CallbackUrl}", callbackUrl);
        return Redirect(steamAuthUrl);
    }

    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] OAuthCallbackRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Provider))
            {
                return BadRequest(new { error = "Provider is required" });
            }

            if (request.Provider.Equals("discord", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(request.Code))
                {
                    return BadRequest(new { error = "Authorization code is required for Discord" });
                }

                var discordRequest = new OAuthExchangeRequest(request.Code, request.State);
                return await ExchangeDiscordCode(discordRequest);
            }
            else if (request.Provider.Equals("steam", StringComparison.OrdinalIgnoreCase))
            {
                // Extract Steam OpenID parameters from the callback request
                var steamRequest = new SteamExchangeRequest(
                    request.OpenIdMode ?? "",
                    request.GetProperty("openid.op_endpoint"),
                    request.GetProperty("openid.claimed_id"),
                    request.GetProperty("openid.identity"),
                    request.GetProperty("openid.return_to"),
                    request.GetProperty("openid.response_nonce"),
                    request.GetProperty("openid.assoc_handle"),
                    request.GetProperty("openid.signed"),
                    request.GetProperty("openid.sig"),
                    request.State
                );
                return await ExchangeSteamCode(steamRequest);
            }
            else
            {
                return BadRequest(new { error = $"Unknown provider: {request.Provider}" });
            }
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error processing OAuth callback");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error processing OAuth callback"));
            return StatusCode(500, new { error = "An error occurred during authentication" });
        }
    }

    [HttpPost("discord/exchange")]
    public async Task<IActionResult> ExchangeDiscordCode([FromBody] OAuthExchangeRequest request)
    {
        if (string.IsNullOrEmpty(request.Code))
        {
            return BadRequest(new { error = "Authorization code is required" });
        }

        try
        {
            var clientId = _configuration.GetRequiredString("Discord:ClientId");
            var clientSecret = _configuration.GetRequiredString("Discord:ClientSecret");
            var frontendUrl = _configuration.GetRequiredString("Frontend:Url");
            var redirectUri = $"{frontendUrl}/auth/callback";

            // Exchange authorization code for access token
            var httpClient = _httpClientFactory.CreateClient();
            var tokenRequest = new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["grant_type"] = "authorization_code",
                ["code"] = request.Code,
                ["redirect_uri"] = redirectUri
            };

            var tokenResponse = await httpClient.PostAsync(
                "https://discord.com/api/oauth2/token",
                new FormUrlEncodedContent(tokenRequest));

            if (!tokenResponse.IsSuccessStatusCode)
            {
                var errorContent = await tokenResponse.Content.ReadAsStringAsync();
                _logger.Error("Discord token exchange failed: {Error}", errorContent);
                return BadRequest(new { error = "Failed to exchange authorization code" });
            }

            var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
            var tokenData = JsonDocument.Parse(tokenJson);
            var accessToken = tokenData.RootElement.GetProperty("access_token").GetString();

            if (string.IsNullOrEmpty(accessToken))
            {
                return BadRequest(new { error = "Failed to obtain access token" });
            }

            // Get user info from Discord
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var userResponse = await httpClient.GetAsync("https://discord.com/api/users/@me");
            if (!userResponse.IsSuccessStatusCode)
            {
                _logger.Error("Failed to fetch Discord user info");
                return BadRequest(new { error = "Failed to fetch user information" });
            }

            var userJson = await userResponse.Content.ReadAsStringAsync();
            var userData = JsonDocument.Parse(userJson);
            
            var discordId = userData.RootElement.GetProperty("id").GetString();
            var email = userData.RootElement.TryGetProperty("email", out var emailElement) 
                ? emailElement.GetString() 
                : null;
            var username = userData.RootElement.GetProperty("username").GetString();
            var avatar = userData.RootElement.TryGetProperty("avatar", out var avatarElement) 
                ? avatarElement.GetString() 
                : null;

            // Build avatar URL
            string? avatarUrl = null;
            if (!string.IsNullOrEmpty(avatar) && !string.IsNullOrEmpty(discordId))
            {
                var extension = avatar.StartsWith("a_") ? "gif" : "png";
                avatarUrl = $"https://cdn.discordapp.com/avatars/{discordId}/{avatar}.{extension}?size=1024";
            }

            if (string.IsNullOrEmpty(discordId) || string.IsNullOrEmpty(username))
            {
                return BadRequest(new { error = "Invalid user data from Discord" });
            }

            // Create or update user
            var user = await _discordAuthService.HandleDiscordCallbackAsync(
                discordId, 
                email ?? string.Empty, 
                username, 
                avatarUrl);

            // Generate tokens
            var jwtAccessToken = _tokenService.GenerateAccessToken(user);
            var ipAddress = HttpContext.GetIPAddress();
            var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user, ipAddress);

            // Set cookies - adapt settings based on environment
            var isProduction = _environment.IsProduction();
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction, // HTTPS only in production; HTTP allowed in development
                SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax, // Cross-site in prod, same-site in dev
                Expires = DateTimeOffset.UtcNow.AddMinutes(60),
                Path = "/"
            };

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction, // HTTPS only in production; HTTP allowed in development
                SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax, // Cross-site in prod, same-site in dev
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            };

            HttpContext.Response.Cookies.Append(AuthConstants.AccessTokenCookie, jwtAccessToken, cookieOptions);
            HttpContext.Response.Cookies.Append(AuthConstants.RefreshTokenCookie, refreshToken.Token, refreshCookieOptions);

            _logger.Information("Discord OAuth exchange successful for user {UserId}", user.Id);

            // Return user data
            var identities = await GetUserIdentitiesAsync(user.Id.ToString());

            return Ok(new
            {
                id = user.Id.ToString(),
                email = user.Email,
                username = user.Username,
                avatarUrl = user.AvatarUrl,
                tier = (int)user.Tier,
                isAdmin = user.IsAdmin,
                linkedIdentities = identities,
                returnUrl = ExtractReturnUrlFromState(request.State)
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error exchanging Discord authorization code");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error exchanging Discord code"));
            return StatusCode(500, new { error = "An error occurred during authentication" });
        }
    }

    [HttpPost("steam/exchange")]
    public async Task<IActionResult> ExchangeSteamCode([FromBody] SteamExchangeRequest request)
    {
        if (string.IsNullOrEmpty(request.OpenIdMode) || request.OpenIdMode != "id_res")
        {
            return BadRequest(new { error = "Invalid OpenID response" });
        }

        try
        {
            var steamApiKey = _configuration.GetRequiredString("Steam:ApiKey");
            
            var returnTo = request.OpenIdReturnTo;
            if (string.IsNullOrEmpty(returnTo))
            {
                _logger.Error("Steam OpenID return_to is missing");
                return BadRequest(new { error = "Invalid Steam authentication response - missing return_to" });
            }

            var validationParams = new Dictionary<string, string>
            {
                ["openid.ns"] = "http://specs.openid.net/auth/2.0",
                ["openid.mode"] = "check_authentication",
                ["openid.op_endpoint"] = request.OpenIdOpEndpoint ?? "https://steamcommunity.com/openid/login",
                ["openid.claimed_id"] = request.OpenIdClaimedId ?? "",
                ["openid.identity"] = request.OpenIdIdentity ?? "",
                ["openid.return_to"] = returnTo,
                ["openid.response_nonce"] = request.OpenIdResponseNonce ?? "",
                ["openid.assoc_handle"] = request.OpenIdAssocHandle ?? "",
                ["openid.signed"] = request.OpenIdSigned ?? "",
                ["openid.sig"] = request.OpenIdSig ?? ""
            };

            var httpClient = _httpClientFactory.CreateClient();
            var validationResponse = await httpClient.PostAsync(
                "https://steamcommunity.com/openid/login",
                new FormUrlEncodedContent(validationParams));

            if (!validationResponse.IsSuccessStatusCode)
            {
                _logger.Error("Steam OpenID validation failed");
                return BadRequest(new { error = "Failed to validate Steam authentication" });
            }

            var validationContent = await validationResponse.Content.ReadAsStringAsync();
            _logger.Information("Steam OpenID validation response: {Response}", validationContent);
            
            if (!validationContent.Contains("is_valid:true"))
            {
                _logger.Error("Steam OpenID validation returned invalid. Response: {Response}", validationContent);
                return BadRequest(new { error = "Invalid Steam authentication response" });
            }

            var claimedId = request.OpenIdClaimedId ?? "";
            if (!claimedId.Contains("/id/"))
            {
                return BadRequest(new { error = "Invalid Steam ID format" });
            }

            var steamId = claimedId.Split(new[] { "/id/" }, StringSplitOptions.None).Last();
            var username = request.OpenIdIdentity?.Split('/').Last() ?? steamId;

            var user = await _steamAuthService.HandleSteamCallbackAsync(steamId, username);

            var accessToken = _tokenService.GenerateAccessToken(user);
            var ipAddress = HttpContext.GetIPAddress();
            var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user, ipAddress);

            var isProduction = _environment.IsProduction();
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction, // HTTPS only in production; HTTP allowed in development
                SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax, // Cross-site in prod, same-site in dev
                Expires = DateTimeOffset.UtcNow.AddMinutes(60),
                Path = "/"
            };

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction, // HTTPS only in production; HTTP allowed in development
                SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax, // Cross-site in prod, same-site in dev
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            };

            HttpContext.Response.Cookies.Append(AuthConstants.AccessTokenCookie, accessToken, cookieOptions);
            HttpContext.Response.Cookies.Append(AuthConstants.RefreshTokenCookie, refreshToken.Token, refreshCookieOptions);

            _logger.Information("Steam OAuth exchange successful for user {UserId}", user.Id);

            // Return user data
            var identities = await GetUserIdentitiesAsync(user.Id.ToString());

            return Ok(new
            {
                id = user.Id.ToString(),
                email = user.Email,
                username = user.Username,
                avatarUrl = user.AvatarUrl,
                tier = (int)user.Tier,
                isAdmin = user.IsAdmin,
                linkedIdentities = identities,
                returnUrl = ExtractReturnUrlFromState(request.State)
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error exchanging Steam authorization code");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error exchanging Steam code"));
            return StatusCode(500, new { error = "An error occurred during authentication" });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
        {
            return BadRequest(new { error = "Refresh token is required" });
        }

        var user = await _tokenService.ValidateRefreshTokenAsync(request.RefreshToken);

        if (user == null)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token" });
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var ipAddress = HttpContext.GetIPAddress();
        var newRefreshToken = await _tokenService.GenerateRefreshTokenAsync(user, ipAddress);
        await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);

        _logger.Information("Refreshed token for user {UserId}", user.Id);

        return Ok(new
        {
            accessToken,
            refreshToken = newRefreshToken.Token,
            expiresIn = 3600
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] LogoutRequest? request = null)
    {
        if (request != null && !string.IsNullOrEmpty(request.RefreshToken))
        {
            await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
        }

        _logger.Information("User logged out");
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized();
        }

        // Fetch user with identities to get avatar and username
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await filesDb.Set<User>()
            .Include(u => u.Identities)
            .FirstOrDefaultAsync(u => u.Id == userGuid);

        if (user == null)
        {
            return Unauthorized();
        }

        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var tierClaim = User.FindFirst(AuthConstants.TierClaim)?.Value;
        var isAdmin = User.FindFirst(AuthConstants.IsAdminClaim)?.Value;

        int tier = 0;
        if (!string.IsNullOrEmpty(tierClaim) && int.TryParse(tierClaim, out var parsedTier))
        {
            tier = parsedTier;
        }

        var identities = await GetUserIdentitiesAsync(userId);

        return Ok(new
        {
            id = userId,
            email = user.Email,
            username = user.Username,
            avatarUrl = user.AvatarUrl,
            tier,
            isAdmin = bool.Parse(isAdmin ?? "false"),
            linkedIdentities = identities
        });
    }

    [HttpGet("linked-identities")]
    [Authorize]
    public async Task<IActionResult> GetLinkedIdentities()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var identities = await GetUserIdentitiesAsync(userId);
        return Ok(identities);
    }

    [HttpPost("unlink")]
    [Authorize]
    public async Task<IActionResult> UnlinkIdentity([FromBody] UnlinkIdentityRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized();
        }

        if (string.IsNullOrEmpty(request.ProviderName))
        {
            return BadRequest(new { error = "ProviderName is required" });
        }

        var identities = await _tokenService.GetUserIdentitiesAsync(userGuid);
        if (identities.Count <= 1)
        {
            return BadRequest(new { error = "Cannot unlink the only authentication method" });
        }

        var result = await _tokenService.UnlinkIdentityAsync(userGuid, request.ProviderName);
        if (!result)
        {
            return BadRequest(new { error = "Failed to unlink identity" });
        }

        _logger.Information("User {UserId} unlinked {Provider}", userGuid, request.ProviderName);
        return Ok(new { message = $"{request.ProviderName} successfully unlinked" });
    }

    private async Task<List<LinkedIdentityResponse>> GetUserIdentitiesAsync(string? userId)
    {
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return [];
        }

        return await _tokenService.GetUserIdentitiesAsync(userGuid);
    }

    private static string? ExtractReturnUrlFromState(string? state)
    {
        if (string.IsNullOrEmpty(state))
            return null;

        var parts = state.Split('|', 2);
        return parts.Length == 2 ? Uri.UnescapeDataString(parts[1]) : null;
    }

    private static string ValidateAndSanitizeReturnUrl(string? returnUrl)
    {
        // Default to root if no returnUrl provided
        if (string.IsNullOrWhiteSpace(returnUrl))
            return "/";

        // Only allow local URLs (must start with / but not //)
        // This prevents open redirect attacks to external domains
        if (returnUrl.StartsWith('/') && !returnUrl.StartsWith("//"))
            return returnUrl;

        // If returnUrl is not local, default to root
        return "/";
    }
}

public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record UnlinkIdentityRequest(string ProviderName);
public record OAuthExchangeRequest(string Code, string? State = null);
public record SteamExchangeRequest(
    string OpenIdMode,
    string? OpenIdOpEndpoint = null,
    string? OpenIdClaimedId = null,
    string? OpenIdIdentity = null,
    string? OpenIdReturnTo = null,
    string? OpenIdResponseNonce = null,
    string? OpenIdAssocHandle = null,
    string? OpenIdSigned = null,
    string? OpenIdSig = null,
    string? State = null);

/// <summary>
/// Unified OAuth callback request that handles both Discord and Steam authentication responses
/// </summary>
public class OAuthCallbackRequest : Dictionary<string, object>
{
    /// <summary>
    /// The authentication provider: "discord" or "steam"
    /// </summary>
    public string? Provider
    {
        get => GetPropertyString("provider");
        set => this["provider"] = value!;
    }

    /// <summary>
    /// OAuth authorization code (Discord only)
    /// </summary>
    public string? Code
    {
        get => GetPropertyString("code");
        set => this["code"] = value!;
    }

    /// <summary>
    /// State parameter for CSRF protection and return URL
    /// </summary>
    public string? State
    {
        get => GetPropertyString("state");
        set => this["state"] = value!;
    }

    /// <summary>
    /// OpenID mode response parameter (Steam only)
    /// </summary>
    public string? OpenIdMode
    {
        get => GetPropertyString("openid.mode");
        set => this["openid.mode"] = value!;
    }

    /// <summary>
    /// Get a property value as string
    /// </summary>
    public string? GetProperty(string key)
    {
        return GetPropertyString(key);
    }

    private string? GetPropertyString(string key)
    {
        if (TryGetValue(key, out var value))
        {
            return value?.ToString();
        }
        return null;
    }
}