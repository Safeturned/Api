using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IApiKeyService
{
    /// <summary>
    /// Generates a new API key for a user
    /// </summary>
    Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyAsync(
        Guid userId,
        string name,
        string prefix,
        DateTime? expiresAt,
        ApiKeyScope scopes,
        string? ipWhitelist);

    /// <summary>
    /// Generates a new API key for a user with custom tier (admin only)
    /// </summary>
    Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyWithCustomTierAsync(
        Guid userId,
        string name,
        string prefix,
        DateTime? expiresAt,
        ApiKeyScope scopes,
        string? ipWhitelist,
        TierType customTier);

    /// <summary>
    /// Validates an API key and returns the associated key record
    /// </summary>
    Task<ApiKey?> ValidateApiKeyAsync(string plainTextKey, string? clientIp = null);

    /// <summary>
    /// Gets all API keys for a user
    /// </summary>
    Task<List<ApiKey>> GetUserApiKeysAsync(Guid userId);

    /// <summary>
    /// Revokes an API key
    /// </summary>
    Task<bool> RevokeApiKeyAsync(Guid apiKeyId, Guid userId);

    /// <summary>
    /// Updates an API key's metadata (name, IP whitelist)
    /// </summary>
    Task<ApiKey?> UpdateApiKeyAsync(Guid apiKeyId, Guid userId, string? name, string? ipWhitelist);

    /// <summary>
    /// Regenerates an API key (creates new key, revokes old one)
    /// </summary>
    Task<(ApiKey apiKey, string plainTextKey)?> RegenerateApiKeyAsync(Guid apiKeyId, Guid userId);

    /// <summary>
    /// Logs API key usage
    /// </summary>
    Task LogApiKeyUsageAsync(Guid apiKeyId, string endpoint, string method, int statusCode, int responseTimeMs, string? clientIp);

    /// <summary>
    /// Updates the last used timestamp for an API key
    /// </summary>
    Task UpdateLastUsedAsync(Guid apiKeyId);

    /// <summary>
    /// Gets the current active API key count and maximum allowed for a user's tier
    /// </summary>
    Task<(int current, int max)> GetApiKeyLimitAsync(Guid userId);
}
