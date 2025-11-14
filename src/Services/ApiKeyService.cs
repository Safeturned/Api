using System.Security.Cryptography;
using System.Text;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public class ApiKeyService : IApiKeyService
{
    private readonly FilesDbContext _context;
    private readonly ILogger _logger;
    private readonly Channel<ApiKeyUsageLogRequest> _usageLogChannel;

    public ApiKeyService(
        FilesDbContext context,
        ILogger logger,
        Channel<ApiKeyUsageLogRequest> usageLogChannel)
    {
        _context = context;
        _logger = logger.ForContext<ApiKeyService>();
        _usageLogChannel = usageLogChannel;
    }

    public async Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyAsync(Guid userId, string name, string prefix, DateTime? expiresAt, string scopes, string? ipWhitelist)
    {
        var user = await _context.Set<User>().FindAsync(userId);
        if (user == null)
        {
            _logger.Error("Cannot create API key: User {UserId} not found", userId);
            throw new InvalidOperationException($"User {userId} not found");
        }

        // Check API key limit for user's tier (admins bypass this limit)
        if (!user.IsAdmin)
        {
            var activeKeyCount = await _context.Set<ApiKey>()
                .CountAsync(k => k.UserId == userId && k.IsActive);
            var maxKeys = TierConstants.GetMaxApiKeys(user.Tier);

            if (activeKeyCount >= maxKeys)
            {
                _logger.Warning("User {UserId} reached API key limit for tier {Tier}: {Count}/{Max}",
                    userId, user.Tier, activeKeyCount, maxKeys);
                throw new InvalidOperationException($"API key limit reached for {user.Tier} tier. Maximum {maxKeys} active key(s) allowed.");
            }
        }

        var randomPart = GenerateSecureRandomString(ApiKeyConstants.KeyRandomLength);
        var plainTextKey = $"{prefix}_{randomPart}";
        var keyHash = HashApiKey(plainTextKey);
        var lastSixChars = randomPart.Substring(randomPart.Length - ApiKeyConstants.KeyLastCharsLength);

        var rateLimitTier = user.Tier;
        var requestsPerHour = TierConstants.GetRateLimit(rateLimitTier);

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
            RateLimitTier = rateLimitTier,
            RequestsPerHour = requestsPerHour,
            IsActive = true,
            Scopes = scopes,
            IpWhitelist = ipWhitelist
        };

        _context.Set<ApiKey>().Add(apiKey);
        await _context.SaveChangesAsync();

        _logger.Information("Generated API key {ApiKeyId} for user {UserId}", apiKey.Id, userId);

        return (apiKey, plainTextKey);
    }

    public async Task<(ApiKey apiKey, string plainTextKey)> GenerateApiKeyWithCustomTierAsync(
        Guid userId,
        string name,
        string prefix,
        DateTime? expiresAt,
        string scopes,
        string? ipWhitelist,
        TierType customTier,
        int customRequestsPerHour)
    {
        var user = await _context.Set<User>().FindAsync(userId);
        if (user == null)
        {
            _logger.Error("Cannot create API key: User {UserId} not found", userId);
            throw new InvalidOperationException($"User {userId} not found");
        }

        var randomPart = GenerateSecureRandomString(ApiKeyConstants.KeyRandomLength);
        var plainTextKey = $"{prefix}_{randomPart}";
        var keyHash = HashApiKey(plainTextKey);
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
            RateLimitTier = customTier,
            RequestsPerHour = customRequestsPerHour,
            IsActive = true,
            Scopes = scopes,
            IpWhitelist = ipWhitelist
        };

        _context.Set<ApiKey>().Add(apiKey);
        await _context.SaveChangesAsync();

        _logger.Information("Generated custom tier API key {ApiKeyId} for user {UserId} with tier {Tier} and {RequestsPerHour} requests/hour",
            apiKey.Id, userId, customTier, customRequestsPerHour);

        return (apiKey, plainTextKey);
    }

    public async Task<ApiKey?> ValidateApiKeyAsync(string plainTextKey, string? clientIp = null)
    {
        var keyHash = HashApiKey(plainTextKey);

        var apiKey = await _context.Set<ApiKey>()
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash && k.IsActive);

        if (apiKey == null)
        {
            _logger.Warning("Invalid API key attempted");
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
        return await _context.Set<ApiKey>()
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> RevokeApiKeyAsync(Guid apiKeyId, Guid userId)
    {
        var apiKey = await _context.Set<ApiKey>()
            .FirstOrDefaultAsync(k => k.Id == apiKeyId && k.UserId == userId);

        if (apiKey == null)
        {
            return false;
        }

        apiKey.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.Information("Revoked API key {ApiKeyId} for user {UserId}", apiKeyId, userId);
        return true;
    }

    public async Task<ApiKey?> UpdateApiKeyAsync(Guid apiKeyId, Guid userId, string? name, string? ipWhitelist)
    {
        var apiKey = await _context.Set<ApiKey>()
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

        await _context.SaveChangesAsync();

        _logger.Information("Updated API key {ApiKeyId}", apiKeyId);
        return apiKey;
    }

    public async Task<(ApiKey apiKey, string plainTextKey)?> RegenerateApiKeyAsync(Guid apiKeyId, Guid userId)
    {
        var oldApiKey = await _context.Set<ApiKey>()
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

        await _context.SaveChangesAsync();

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
        var apiKey = await _context.Set<ApiKey>().FindAsync(apiKeyId);
        if (apiKey != null)
        {
            apiKey.LastUsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<(int current, int max)> GetApiKeyLimitAsync(Guid userId)
    {
        var user = await _context.Set<User>().FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException($"User {userId} not found");
        }

        var activeKeyCount = await _context.Set<ApiKey>()
            .CountAsync(k => k.UserId == userId && k.IsActive);

        // Admins have unlimited API keys (represented as 9999)
        var maxKeys = user.IsAdmin ? 9999 : TierConstants.GetMaxApiKeys(user.Tier);

        return (activeKeyCount, maxKeys);
    }

    private static string GenerateSecureRandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var randomBytes = new byte[length];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var result = new char[length];
        for (var i = 0; i < length; i++)
        {
            result[i] = chars[randomBytes[i] % chars.Length];
        }
        return new string(result);
    }

    private static string HashApiKey(string plainTextKey)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(plainTextKey));
        return Convert.ToBase64String(hashBytes);
    }
}