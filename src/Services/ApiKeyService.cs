using System.Security.Cryptography;
using System.Text;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public class ApiKeyService : IApiKeyService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;
    private readonly Channel<ApiKeyUsageLogRequest> _usageLogChannel;

    public ApiKeyService(
        IServiceScopeFactory serviceScopeFactory,
        ILogger logger,
        Channel<ApiKeyUsageLogRequest> usageLogChannel)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<ApiKeyService>();
        _usageLogChannel = usageLogChannel;
    }

    public async Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyAsync(Guid userId, string name, string prefix, DateTime? expiresAt, ApiKeyScope scopes, string? ipWhitelist)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            _logger.Error("Cannot create API key: User {UserId} not found", userId);
            throw new InvalidOperationException($"User {userId} not found");
        }

        // Check API key limit for user's tier (admins bypass this limit)
        if (!user.IsAdmin)
        {
            var activeKeyCount = await db.Set<ApiKey>()
                .CountAsync(k => k.UserId == userId && k.IsActive);
            var maxKeys = TierConstants.GetMaxApiKeys(user.Tier);

            if (activeKeyCount >= maxKeys)
            {
                _logger.Warning("User {UserId} reached API key limit for tier {Tier}: {Count}/{Max}",
                    userId, user.Tier, activeKeyCount, maxKeys);
                throw new InvalidOperationException($"API key limit reached for {user.Tier} tier. Maximum {maxKeys} active key(s) allowed.");
            }
        }

        var randomPart = ApiKeyHelper.GenerateSecureRandomString(ApiKeyConstants.KeyRandomLength);
        var plainTextKey = $"{prefix}_{randomPart}";
        var keyHash = ApiKeyHelper.HashApiKey(plainTextKey);
        var lastSixChars = randomPart.Substring(randomPart.Length - ApiKeyConstants.KeyLastCharsLength);

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            KeyHash = keyHash,
            Name = name,
            Prefix = prefix,
            LastSixChars = lastSixChars,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            IsActive = true,
            Scopes = scopes,
            IpWhitelist = ipWhitelist
        };

        db.Set<ApiKey>().Add(apiKey);
        await db.SaveChangesAsync();

        _logger.Information("Generated API key {ApiKeyId} for user {UserId}", apiKey.Id, userId);

        return (apiKey, plainTextKey);
    }

    public async Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyWithCustomTierAsync(
        Guid userId, string name, string prefix, DateTime? expiresAt, ApiKeyScope scopes, string? ipWhitelist, TierType customTier)
    {
        // Note: This method is for admin use to create API keys with a specific tier for a user
        // The tier is stored on the User model, not the ApiKey
        // This currently reuses GenerateApiKeyAsync since the tier comes from the User
        // If you need to change a user's tier, update the User record directly
        return await GenerateApiKeyAsync(userId, name, prefix, expiresAt, scopes, ipWhitelist);
    }

    public async Task<ApiKey?> ValidateApiKeyAsync(string plainTextKey, string? clientIp = null)
    {
        var keyHash = ApiKeyHelper.HashApiKey(plainTextKey);

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKey = await db.Set<ApiKey>()
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash);

        if (apiKey == null)
        {
            _logger.Warning("Invalid API key attempted");
            return null;
        }

        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(apiKey.KeyHash),
            Encoding.UTF8.GetBytes(keyHash)))
        {
            _logger.Warning("API key hash mismatch");
            return null;
        }

        if (!apiKey.IsActive)
        {
            _logger.Warning("Inactive API key {ApiKeyId} attempted", apiKey.Id);
            return null;
        }

        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.Warning("Expired API key {ApiKeyId} attempted", apiKey.Id);
            return null;
        }

        if (!apiKey.User.IsActive)
        {
            _logger.Warning("Inactive user {UserId} attempted to use API key", apiKey.UserId);
            return null;
        }

        if (!string.IsNullOrEmpty(apiKey.IpWhitelist) && !string.IsNullOrEmpty(clientIp))
        {
            var allowedIps = apiKey.IpWhitelist.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!allowedIps.Contains(clientIp))
            {
                _logger.Warning("IP {ClientIp} not whitelisted for API key {ApiKeyId}", clientIp, apiKey.Id);
                return null;
            }
        }

        return apiKey;
    }

    public async Task<List<ApiKey>> GetUserApiKeysAsync(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<ApiKey>()
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> RevokeApiKeyAsync(Guid apiKeyId, Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKey = await db.Set<ApiKey>()
            .FirstOrDefaultAsync(k => k.Id == apiKeyId && k.UserId == userId);

        if (apiKey == null)
        {
            return false;
        }

        apiKey.IsActive = false;
        await db.SaveChangesAsync();

        _logger.Information("Revoked API key {ApiKeyId} for user {UserId}", apiKeyId, userId);
        return true;
    }

    public async Task<ApiKey?> UpdateApiKeyAsync(Guid apiKeyId, Guid userId, string? name, string? ipWhitelist)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKey = await db.Set<ApiKey>()
            .FirstOrDefaultAsync(k => k.Id == apiKeyId && k.UserId == userId);

        if (apiKey == null)
        {
            return null;
        }

        if (!string.IsNullOrEmpty(name))
        {
            apiKey.Name = name;
        }

        apiKey.IpWhitelist = ipWhitelist;

        await db.SaveChangesAsync();

        _logger.Information("Updated API key {ApiKeyId}", apiKeyId);
        return apiKey;
    }

    public async Task<(ApiKey apiKey, string plainTextKey)?> RegenerateApiKeyAsync(Guid apiKeyId, Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var oldApiKey = await db.Set<ApiKey>()
            .FirstOrDefaultAsync(k => k.Id == apiKeyId && k.UserId == userId);

        if (oldApiKey == null)
        {
            return null;
        }

        oldApiKey.IsActive = false;

        var (newApiKey, plainTextKey) = await GenerateApiKeyAsync(
            userId,
            oldApiKey.Name,
            oldApiKey.Prefix,
            oldApiKey.ExpiresAt,
            oldApiKey.Scopes,
            oldApiKey.IpWhitelist
        );

        await db.SaveChangesAsync();

        _logger.Information("Regenerated API key {OldKeyId} -> {NewKeyId}", apiKeyId, newApiKey.Id);
        return (newApiKey, plainTextKey);
    }

    public async Task LogApiKeyUsageAsync(Guid apiKeyId, string endpoint, string method, int statusCode, int responseTimeMs, string? clientIp)
    {
        var logRequest = new ApiKeyUsageLogRequest(
            apiKeyId,
            endpoint,
            method,
            statusCode,
            responseTimeMs,
            clientIp
        );

        if (!_usageLogChannel.Writer.TryWrite(logRequest))
        {
            _logger.Warning("Failed to queue API key usage log for {ApiKeyId}", apiKeyId);
        }

        await Task.CompletedTask;
    }

    public async Task UpdateLastUsedAsync(Guid apiKeyId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var apiKey = await db.Set<ApiKey>().FindAsync(apiKeyId);
        if (apiKey != null)
        {
            apiKey.LastUsedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    public async Task<(int current, int max)> GetApiKeyLimitAsync(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException($"User {userId} not found");
        }

        var activeKeyCount = await db.Set<ApiKey>()
            .CountAsync(k => k.UserId == userId && k.IsActive);

        // Admins have unlimited API keys (represented as 9999)
        var maxKeys = user.IsAdmin ? 9999 : TierConstants.GetMaxApiKeys(user.Tier);

        return (activeKeyCount, maxKeys);
    }

}