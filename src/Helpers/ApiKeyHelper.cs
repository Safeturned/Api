using System.Security.Cryptography;
using System.Text;
using Safeturned.Api.Constants;

namespace Safeturned.Api.Helpers;

public static class ApiKeyHelper
{
    /// <summary>
    /// Generates a cryptographically secure random string of specified length.
    /// Uses only alphanumeric characters (A-Z, a-z, 0-9).
    /// </summary>
    /// <param name="length">Length of the string to generate</param>
    /// <returns>Random alphanumeric string</returns>
    public static string GenerateSecureRandomString(int length)
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

    /// <summary>
    /// Hashes an API key using SHA256.
    /// </summary>
    /// <param name="plainTextKey">Plain text API key to hash</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static string HashApiKey(string plainTextKey)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(plainTextKey));
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Builds a complete API key from prefix and random part.
    /// Format: {prefix}_{randomPart} (e.g., "sk_live_ABC123...")
    /// </summary>
    /// <param name="prefix">Prefix without trailing underscore (e.g., "sk_live")</param>
    /// <param name="randomPart">Random alphanumeric string</param>
    /// <returns>Complete API key string</returns>
    public static string BuildApiKey(string prefix, string randomPart)
    {
        return $"{prefix}_{randomPart}";
    }

    /// <summary>
    /// Generates a new complete API key with the specified prefix.
    /// </summary>
    /// <param name="prefix">Prefix without trailing underscore (e.g., "sk_live")</param>
    /// <returns>Complete API key string</returns>
    public static string GenerateApiKey(string prefix)
    {
        var randomPart = GenerateSecureRandomString(ApiKeyConstants.KeyRandomLength);
        return BuildApiKey(prefix, randomPart);
    }

    /// <summary>
    /// Extracts the prefix from an API key (e.g., "sk_live" from "sk_live_ABC123").
    /// </summary>
    /// <param name="apiKey">Full API key</param>
    /// <returns>Prefix without trailing underscore</returns>
    public static string ExtractPrefix(string apiKey)
    {
        var parts = apiKey.Split('_');
        if (parts.Length >= 2)
        {
            return $"{parts[0]}_{parts[1]}"; // e.g., "sk_live" from ["sk", "live", "ABC123"]
        }
        return parts[0];
    }

    /// <summary>
    /// Checks if a key starts with a valid API key prefix format.
    /// </summary>
    public static bool HasValidPrefix(string apiKey)
    {
        return apiKey.StartsWith($"{ApiKeyConstants.LivePrefix}_") ||
               apiKey.StartsWith($"{ApiKeyConstants.TestPrefix}_");
    }
}
