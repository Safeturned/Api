using System.Security.Cryptography;
using System.Text;

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
}
