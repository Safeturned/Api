namespace Safeturned.Api.Services;

public interface IOfficialBadgeService
{
    /// <summary>
    /// Analyzes the given file content, stores the FileData, and updates the official badge.
    /// </summary>
    /// <param name="badgeId">The official badge ID (e.g., "official_moduleloader")</param>
    /// <param name="fileName">The name of the file</param>
    /// <param name="content">The file content bytes</param>
    /// <param name="version">The version string (e.g., "v1.0.0")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The file hash if successful, null if failed</returns>
    Task<string?> AnalyzeAndUpdateBadgeAsync(string badgeId, string fileName, byte[] content, string version, CancellationToken cancellationToken = default);
}
