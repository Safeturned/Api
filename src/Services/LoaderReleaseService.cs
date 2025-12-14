using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class LoaderReleaseService : ILoaderReleaseService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger _logger;

    public LoaderReleaseService(IServiceScopeFactory scopeFactory, ILogger logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger.ForContext<LoaderReleaseService>();
    }

    public async Task<LoaderRelease?> GetLatestAsync(string framework, string configuration, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var release = await db.Set<LoaderRelease>()
            .AsNoTracking()
            .Where(x => x.Framework == framework && x.Configuration == configuration && x.IsLatest)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (release != null)
        {
            ValidateContentHash(release);
        }

        return release;
    }

    public async Task<LoaderRelease?> GetByVersionAsync(string framework, string configuration, string version, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var release = await db.Set<LoaderRelease>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Framework == framework && x.Configuration == configuration && x.Version == version, cancellationToken);

        if (release != null)
        {
            ValidateContentHash(release);
        }

        return release;
    }

    public async Task<List<LoaderVersionInfo>> GetAllVersionsAsync(string framework, string configuration, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<LoaderRelease>()
            .AsNoTracking()
            .Where(x => x.Framework == framework && x.Configuration == configuration && x.Content != null)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new LoaderVersionInfo(x.Version, x.CreatedAt, x.IsLatest))
            .ToListAsync(cancellationToken);
    }

    public async Task<LoaderRelease> UpsertAsync(LoaderRelease release, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var existing = await db.Set<LoaderRelease>()
            .FirstOrDefaultAsync(x => x.Framework == release.Framework && x.Configuration == release.Configuration && x.Version == release.Version, cancellationToken);

        if (existing == null)
        {
            release.Id = Guid.NewGuid();
            release.CreatedAt = DateTime.UtcNow;
            db.Set<LoaderRelease>().Add(release);
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

    public async Task MarkLatestAsync(string framework, string configuration, string version, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var releases = db.Set<LoaderRelease>().Where(x => x.Framework == framework && x.Configuration == configuration);
        await releases.ExecuteUpdateAsync(setters => setters.SetProperty(r => r.IsLatest, r => r.Version == version), cancellationToken);
    }

    private void ValidateContentHash(LoaderRelease release)
    {
        if (release.Content == null || string.IsNullOrEmpty(release.ContentHash))
        {
            return;
        }

        var currentHash = Convert.ToBase64String(SHA256.HashData(release.Content));
        if (currentHash != release.ContentHash)
        {
            _logger.Error("Loader integrity check failed for {Framework} {Version}. Expected: {Expected}, Got: {Actual}",
                release.Framework, release.Version, release.ContentHash, currentHash);
            throw new InvalidOperationException($"Loader integrity check failed for {release.Framework} {release.Version}");
        }
    }
}
