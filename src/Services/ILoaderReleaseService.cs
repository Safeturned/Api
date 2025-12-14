using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public record LoaderVersionInfo(string Version, DateTime CreatedAt, bool IsLatest);

public interface ILoaderReleaseService
{
    Task<LoaderRelease?> GetLatestAsync(string framework, string configuration, CancellationToken cancellationToken = default);
    Task<LoaderRelease?> GetByVersionAsync(string framework, string configuration, string version, CancellationToken cancellationToken = default);
    Task<List<LoaderVersionInfo>> GetAllVersionsAsync(string framework, string configuration, CancellationToken cancellationToken = default);
    Task<LoaderRelease> UpsertAsync(LoaderRelease release, CancellationToken cancellationToken = default);
    Task MarkLatestAsync(string framework, string configuration, string version, CancellationToken cancellationToken = default);
}
