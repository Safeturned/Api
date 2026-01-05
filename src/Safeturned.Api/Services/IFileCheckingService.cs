using Safeturned.Api.Clients.FileChecker;

namespace Safeturned.Api.Services;

public interface IFileCheckingService
{
    Task<FileCheckResult> CheckFileAsync(Stream fileStream, CancellationToken cancellationToken = default);
    Task<bool> CanProcessFileAsync(Stream fileStream, CancellationToken cancellationToken = default);
    Task<string> GetVersionAsync(CancellationToken cancellationToken = default);
}
