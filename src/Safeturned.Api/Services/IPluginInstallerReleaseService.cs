using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IPluginInstallerReleaseService
{
    Task<PluginInstallerRelease?> GetLatestAsync(string framework, CancellationToken cancellationToken = default);
    Task<PluginInstallerRelease?> GetByVersionAsync(string framework, string version, CancellationToken cancellationToken = default);
    Task<PluginInstallerRelease> UpsertAsync(PluginInstallerRelease release, CancellationToken cancellationToken = default);
    Task MarkLatestAsync(string framework, string version, CancellationToken cancellationToken = default);
}
