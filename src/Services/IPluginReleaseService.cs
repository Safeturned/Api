using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IPluginReleaseService
{
    Task<PluginRelease?> GetLatestAsync(string framework, CancellationToken cancellationToken = default);
    Task<PluginRelease?> GetByVersionAsync(string framework, string version, CancellationToken cancellationToken = default);
    Task<PluginRelease> UpsertAsync(PluginRelease release, CancellationToken cancellationToken = default);
    Task MarkLatestAsync(string framework, string version, CancellationToken cancellationToken = default);
}
