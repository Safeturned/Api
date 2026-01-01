using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class PluginReleaseService : IPluginReleaseService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger _logger;

    public PluginReleaseService(IServiceScopeFactory scopeFactory, ILogger logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger.ForContext<PluginReleaseService>();
    }

    public async Task<PluginRelease?> GetLatestAsync(string framework, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<PluginRelease>()
            .AsNoTracking()
            .Where(x => x.Framework == framework && x.IsLatest)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<PluginRelease?> GetByVersionAsync(string framework, string version, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<PluginRelease>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Framework == framework && x.Version == version, cancellationToken);
    }

    public async Task<PluginRelease> UpsertAsync(PluginRelease release, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var existing = await db.Set<PluginRelease>()
            .FirstOrDefaultAsync(x => x.Framework == release.Framework && x.Version == release.Version, cancellationToken);

        if (existing == null)
        {
            release.Id = Guid.NewGuid();
            release.CreatedAt = DateTime.UtcNow;
            db.Set<PluginRelease>().Add(release);
        }
        else
        {
            existing.DownloadUrl = release.DownloadUrl;
            existing.Sha256 = release.Sha256;
            existing.SourceRepo = release.SourceRepo;
            existing.AssetName = release.AssetName;
            existing.PackedVersion = release.PackedVersion;
            existing.Content = release.Content;
            existing.ContentHash = release.ContentHash;
        }

        await db.SaveChangesAsync(cancellationToken);
        return existing ?? release;
    }

    public async Task MarkLatestAsync(string framework, string version, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var releases = db.Set<PluginRelease>();
        await releases.ExecuteUpdateAsync(setters => setters.SetProperty(r => r.IsLatest, r => r.Framework == framework && r.Version == version), cancellationToken);
    }
}
