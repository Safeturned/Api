using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;
using System.Security.Claims;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/users/me/api-keys")]
[Authorize]
public class ApiKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger _logger;

    public ApiKeysController(IApiKeyService apiKeyService, ILogger logger)
    {
        _apiKeyService = apiKeyService;
        _logger = logger.ForContext<ApiKeysController>();
    }

    [HttpGet]
    public async Task<IActionResult> GetApiKeys()
    {
        var userId = GetUserId();
        var apiKeys = await _apiKeyService.GetUserApiKeysAsync(userId);

        var response = apiKeys.Select(k => new
        {
            id = k.Id,
            name = k.Name,
            maskedKey = $"{k.Prefix}_...{k.LastSixChars}",
            createdAt = k.CreatedAt,
            expiresAt = k.ExpiresAt,
            lastUsedAt = k.LastUsedAt,
            isActive = k.IsActive,
            scopes = ApiKeyScopeHelper.ScopesToArray(k.Scopes),
            ipWhitelist = k.IpWhitelist
        });

        return Ok(response);
    }

    [HttpGet("limits")]
    public async Task<IActionResult> GetApiKeyLimits()
    {
        var userId = GetUserId();
        var (current, max) = await _apiKeyService.GetApiKeyLimitAsync(userId);

        return Ok(new
        {
            current,
            max,
            canCreateMore = current < max
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateApiKey([FromBody] CreateApiKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        var userId = GetUserId();
        var prefix = request.Prefix ?? ApiKeyConstants.LivePrefix;
        var scopes = ApiKeyScopeHelper.StringArrayToScopes(request.Scopes);

        try
        {
            var (apiKey, plainTextKey) = await _apiKeyService.GenerateApiKeyAsync(
                userId,
                request.Name,
                prefix,
                request.ExpiresAt,
                scopes,
                request.IpWhitelist
            );

            _logger.Information("User {UserId} created API key {ApiKeyId}", userId, apiKey.Id);

            return Ok(new
            {
                id = apiKey.Id,
                name = apiKey.Name,
                key = plainTextKey,
                maskedKey = $"{apiKey.Prefix}_...{apiKey.LastSixChars}",
                createdAt = apiKey.CreatedAt,
                expiresAt = apiKey.ExpiresAt,
                scopes = ApiKeyScopeHelper.ScopesToArray(apiKey.Scopes),
                ipWhitelist = apiKey.IpWhitelist,
                warning = "Save this key securely. It will not be shown again!"
            });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key limit reached"))
        {
            _logger.Warning("User {UserId} reached API key limit: {Message}", userId, ex.Message);
            return BadRequest(new
            {
                error = "API key limit reached",
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            _logger.Warning("User {UserId} not found in database when creating API key", userId);
            return BadRequest(new
            {
                error = "User session invalid",
                message = "Your user account was not found. This can happen in development mode when the database is reset. Please logout and login again.",
                details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Unexpected error creating API key for user {UserId}", userId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Unexpected error creating API key"));
            return StatusCode(500, new { error = "Failed to create API key", message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateApiKey(Guid id, [FromBody] UpdateApiKeyRequest request)
    {
        var userId = GetUserId();
        var apiKey = await _apiKeyService.UpdateApiKeyAsync(id, userId, request.Name, request.IpWhitelist);

        if (apiKey == null)
        {
            return NotFound(new { error = "API key not found" });
        }

        _logger.Information("User {UserId} updated API key {ApiKeyId}", userId, id);

        return Ok(new
        {
            id = apiKey.Id,
            name = apiKey.Name,
            ipWhitelist = apiKey.IpWhitelist,
            message = "API key updated successfully"
        });
    }

    [HttpPost("{id}/regenerate")]
    public async Task<IActionResult> RegenerateApiKey(Guid id)
    {
        var userId = GetUserId();
        var result = await _apiKeyService.RegenerateApiKeyAsync(id, userId);

        if (result == null)
        {
            return NotFound(new { error = "API key not found" });
        }

        var (apiKey, plainTextKey) = result.Value;

        _logger.Information("User {UserId} regenerated API key {ApiKeyId}", userId, id);

        return Ok(new
        {
            id = apiKey.Id,
            name = apiKey.Name,
            key = plainTextKey, // ONLY returned on regeneration!
            maskedKey = $"{apiKey.Prefix}_...{apiKey.LastSixChars}",
            createdAt = apiKey.CreatedAt,
            warning = "Save this key securely. It will not be shown again!"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeApiKey(Guid id)
    {
        var userId = GetUserId();
        var success = await _apiKeyService.RevokeApiKeyAsync(id, userId);

        if (!success)
        {
            return NotFound(new { error = "API key not found" });
        }

        _logger.Information("User {UserId} revoked API key {ApiKeyId}", userId, id);

        return Ok(new { message = "API key revoked successfully" });
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

public record CreateApiKeyRequest(
    string Name,
    string? Prefix,
    DateTime? ExpiresAt,
    string[]? Scopes,
    string? IpWhitelist
);

public record UpdateApiKeyRequest(
    string? Name,
    string? IpWhitelist
);