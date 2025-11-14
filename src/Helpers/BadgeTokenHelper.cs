using System.Security.Cryptography;
using System.Text;

namespace Safeturned.Api.Helpers;

public static class BadgeTokenHelper
{
    /// <summary>
    /// Generates a cryptographically secure random token for badge updates
    /// </summary>
    /// <returns>A 32-character alphanumeric token</returns>
    public static string GenerateToken()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var tokenBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(tokenBytes);
        }

        var token = new StringBuilder(32);
        foreach (var b in tokenBytes)
        {
            token.Append(chars[b % chars.Length]);
        }

        return token.ToString();
    }

    /// <summary>
    /// Hashes a token using SHA256 for secure storage
    /// </summary>
    /// <param name="token">The plain token to hash</param>
    /// <returns>SHA256 hash as hexadecimal string</returns>
    public static string HashToken(string token)
    {
        if (string.IsNullOrEmpty(token))
            throw new ArgumentNullException(nameof(token));

        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Verifies if a plain token matches a stored hash
    /// </summary>
    /// <param name="plainToken">The token to verify</param>
    /// <param name="storedHash">The stored hash to compare against</param>
    /// <returns>True if the token matches the hash</returns>
    public static bool VerifyToken(string plainToken, string storedHash)
    {
        if (string.IsNullOrEmpty(plainToken) || string.IsNullOrEmpty(storedHash))
            return false;

        var hashToCompare = HashToken(plainToken);
        return string.Equals(hashToCompare, storedHash, StringComparison.OrdinalIgnoreCase);
    }
}
