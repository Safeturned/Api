using System.Security.Claims;
using Asp.Versioning;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;

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

    public AuthController(
        ITokenService tokenService,
        IDiscordAuthService discordAuthService,
        ISteamAuthService steamAuthService,
        ILogger logger)
    {
        _tokenService = tokenService;
        _discordAuthService = discordAuthService;
        _steamAuthService = steamAuthService;
        _logger = logger.ForContext<AuthController>();
    }

    [HttpGet("discord")]
    public IActionResult DiscordLogin([FromQuery] string returnUrl = "/")
    {
        _logger.Information("Discord login initiated with returnUrl: {ReturnUrl}", returnUrl);

        // Don't validate returnUrl with IsLocalUrl since frontend is on different port
        // Just ensure it's not empty
        if (string.IsNullOrWhiteSpace(returnUrl))
            returnUrl = "/";

        var properties = new AuthenticationProperties
        {
            IsPersistent = true,
            Items =
            {
                ["returnUrl"] = returnUrl
            }
        };

        _logger.Information("Stored returnUrl in properties: {ReturnUrl}", returnUrl);

        return Challenge(properties, DiscordAuthenticationDefaults.AuthenticationScheme);
    }

    [HttpGet("discord/callback")]
    public async Task<IActionResult> DiscordCallback()
    {
        _logger.Information("Discord callback received");

        var result = await HttpContext.AuthenticateAsync("Discord");
        if (!result.Succeeded)
        {
            _logger.Error("Discord authentication failed");
            return BadRequest(new { error = "Discord authentication failed" });
        }

        _logger.Information("Discord authentication succeeded");

        var discordId = result.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = result.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var username = result.Principal?.FindFirst(ClaimTypes.Name)?.Value;
        var avatarClaim = result.Principal?.FindFirst("urn:discord:avatar:url")?.Value;

        _logger.Information("Discord claims - ID: {DiscordId}, Email: {Email}, Username: {Username}",
            discordId, email, username);

        var user = await _discordAuthService.HandleDiscordCallbackAsync(discordId!, email!, username!, avatarClaim);

        _logger.Information("User created/updated: {UserId}", user.Id);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var ipAddress = HttpContext.GetIPAddress();
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user, ipAddress);

        _logger.Information("Tokens generated for user {UserId}", user.Id);

        result.Properties.Items.TryGetValue("returnUrl", out var returnUrl);
        _logger.Information("Retrieved returnUrl from properties: {ReturnUrl}", returnUrl ?? "null");

        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            returnUrl = "/";
            _logger.Warning("returnUrl was null or empty, using default '/'");
        }

        var finalUrl = $"{returnUrl}?access_token={accessToken}&refresh_token={refreshToken.Token}";
        _logger.Information("Redirecting to: {FinalUrl}", finalUrl);

        return Redirect(finalUrl);
    }

    [HttpGet("steam")]
    public IActionResult SteamLogin([FromQuery] string returnUrl = "/")
    {
        _logger.Information("Steam login initiated with returnUrl: {ReturnUrl}", returnUrl);

        if (string.IsNullOrWhiteSpace(returnUrl))
            returnUrl = "/";

        var properties = new AuthenticationProperties
        {
            IsPersistent = true,
            Items =
            {
                ["returnUrl"] = returnUrl
            }
        };

        _logger.Information("Stored returnUrl in properties: {ReturnUrl}", returnUrl);

        return Challenge(properties, "Steam");
    }

    [HttpGet("steam/callback")]
    public async Task<IActionResult> SteamCallback()
    {
        _logger.Information("Steam callback received");

        var result = await HttpContext.AuthenticateAsync("Steam");
        if (!result.Succeeded)
        {
            _logger.Error("Steam authentication failed");
            return BadRequest(new { error = "Steam authentication failed" });
        }

        _logger.Information("Steam authentication succeeded");

        var steamId = result.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var username = result.Principal?.FindFirst(ClaimTypes.Name)?.Value;

        _logger.Information("Steam claims - ID: {SteamId}, Username: {Username}",
            steamId, username);

        var user = await _steamAuthService.HandleSteamCallbackAsync(steamId!, username!);

        _logger.Information("User created/updated: {UserId}", user.Id);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var ipAddress = HttpContext.GetIPAddress();
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user, ipAddress);

        _logger.Information("Tokens generated for user {UserId}", user.Id);

        result.Properties.Items.TryGetValue("returnUrl", out var returnUrl);
        _logger.Information("Retrieved returnUrl from properties: {ReturnUrl}", returnUrl ?? "null");

        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            returnUrl = "/";
            _logger.Warning("returnUrl was null or empty, using default '/'");
        }

        var finalUrl = $"{returnUrl}?access_token={accessToken}&refresh_token={refreshToken.Token}";
        _logger.Information("Redirecting to: {FinalUrl}", finalUrl);

        return Redirect(finalUrl);
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
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        if (!string.IsNullOrEmpty(request.RefreshToken))
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
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var tierClaim = User.FindFirst("tier")?.Value;
        var isAdmin = User.FindFirst("is_admin")?.Value;

        int tier = 0;
        if (!string.IsNullOrEmpty(tierClaim) && int.TryParse(tierClaim, out var parsedTier))
        {
            tier = parsedTier;
        }

        var identities = await GetUserIdentitiesAsync(userId);

        return Ok(new
        {
            id = userId,
            email,
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

        // Prevent unlinking the last provider
        var identities = await _tokenService.GetUserIdentitiesAsync(userGuid);
        if (identities.Count <= 1)
        {
            return BadRequest(new { error = "Cannot unlink the only authentication method" });
        }

        // Unlink the identity
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
}

public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record UnlinkIdentityRequest(string ProviderName);