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
    /// Generates a random salt for token hashing (16 bytes converted to hex)
    /// </summary>
    /// <returns>A 32-character hexadecimal salt</returns>
    public static string GenerateSalt()
    {
        var saltBytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(saltBytes);
        }

        return Convert.ToHexString(saltBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Hashes a token using SHA256 with optional salt for secure storage
    /// </summary>
    /// <param name="token">The plain token to hash</param>
    /// <param name="salt">Optional salt to include in hash (prevents rainbow tables)</param>
    /// <returns>SHA256 hash as hexadecimal string</returns>
    public static string HashToken(string token, string? salt = null)
    {
        if (string.IsNullOrEmpty(token))
            throw new ArgumentNullException(nameof(token));

        using var sha256 = SHA256.Create();
        var input = salt != null ? $"{token}{salt}" : token;
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Verifies if a plain token matches a stored hash with optional salt
    /// </summary>
    /// <param name="plainToken">The token to verify</param>
    /// <param name="storedHash">The stored hash to compare against</param>
    /// <param name="salt">Optional salt that was used during hashing</param>
    /// <returns>True if the token matches the hash</returns>
    public static bool VerifyToken(string plainToken, string storedHash, string? salt = null)
    {
        if (string.IsNullOrEmpty(plainToken) || string.IsNullOrEmpty(storedHash))
            return false;

        var hashToCompare = HashToken(plainToken, salt);

        try
        {
            var hashBytes = Convert.FromHexString(hashToCompare);
            var storedBytes = Convert.FromHexString(storedHash);

            return CryptographicOperations.FixedTimeEquals(hashBytes, storedBytes);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
