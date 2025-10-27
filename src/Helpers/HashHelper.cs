using System.Security.Cryptography;
using Polly;

namespace Safeturned.Api.Helpers;

/// <summary>
/// Static helper class for computing file and data hashes
/// </summary>
public static class HashHelper
{
    /// <summary>
    /// Computes SHA256 hash of byte array data
    /// </summary>
    /// <param name="data">The data to hash</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static string ComputeHash(byte[] data)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(data);
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Computes SHA256 hash of a file stream
    /// </summary>
    /// <param name="stream">The file stream to hash</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static string ComputeHash(Stream stream)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(stream);
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Computes SHA256 hash of a file stream asynchronously
    /// </summary>
    /// <param name="stream">The file stream to hash</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static async Task<string> ComputeHashAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = await sha256.ComputeHashAsync(stream, cancellationToken);
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Computes SHA256 hash of a file by path asynchronously
    /// </summary>
    /// <param name="filePath">The file path to hash</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static async Task<string> ComputeFileHashAsync(string filePath, CancellationToken cancellationToken = default)
    {
        using var sha256 = SHA256.Create();
        await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.SequentialScan);
        var hashBytes = await sha256.ComputeHashAsync(stream, cancellationToken);
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Computes SHA256 hash of a file by path asynchronously with retry logic for file access
    /// </summary>
    /// <param name="filePath">The file path to hash</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static async Task<string> ComputeFileHashWithRetryAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var retryPolicy = Policy
            .Handle<IOException>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromMilliseconds(100 * retryAttempt));
        return await retryPolicy.ExecuteAsync(async (ct) =>
        {
            return await ComputeFileHashAsync(filePath, ct);
        }, cancellationToken);
    }

    /// <summary>
    /// Computes SHA256 hash of an IFormFile
    /// </summary>
    /// <param name="file">The form file to hash</param>
    /// <returns>Base64 encoded SHA256 hash</returns>
    public static string ComputeHash(IFormFile file)
    {
        using var sha256 = SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = sha256.ComputeHash(stream);
        return Convert.ToBase64String(hashBytes);
    }
}
