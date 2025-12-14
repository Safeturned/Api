using System.Security.Cryptography;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class PluginInstallerCdJob
{
    private readonly IPluginInstallerReleaseService _releaseService;
    private readonly ILogger _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public PluginInstallerCdJob(IPluginInstallerReleaseService releaseService, IHttpClientFactory httpClientFactory, ILogger logger)
    {
        _releaseService = releaseService;
        _httpClientFactory = httpClientFactory;
        _logger = logger.ForContext<PluginInstallerCdJob>();
    }

    [SentryMonitorSlug("plugininstaller-cd")]
    public async Task ProcessAsync(PerformContext context, string repoName, string framework, string version, string downloadUrl, string sha256, bool markLatest, string? assetName, CancellationToken ct)
    {
        context.WriteLine("Processing plugin installer release {0} for framework {1}", version, framework);

        var packedVersion = VersionPackingHelper.Pack(version);

        byte[]? content = null;
        string? contentHash = null;
        var hash = sha256;

        if (!string.IsNullOrWhiteSpace(downloadUrl))
        {
            context.WriteLine("Downloading plugin installer from {0}", downloadUrl);
            content = await DownloadContentAsync(downloadUrl, ct);

            if (content != null)
            {
                contentHash = Convert.ToBase64String(SHA256.HashData(content));
                context.WriteLine("Downloaded {0} bytes, hash: {1}", content.Length, contentHash);

                if (string.IsNullOrWhiteSpace(hash))
                {
                    hash = contentHash;
                }
            }
            else
            {
                _logger.Warning("Failed to download plugin installer content from {Url}", downloadUrl);
                context.WriteLine("Warning: Failed to download plugin installer content");
            }
        }

        var release = new PluginInstallerRelease
        {
            Framework = framework,
            Version = version,
            PackedVersion = packedVersion,
            DownloadUrl = downloadUrl,
            Sha256 = hash,
            SourceRepo = repoName,
            AssetName = assetName,
            IsLatest = markLatest,
            Content = content,
            ContentHash = contentHash
        };

        await _releaseService.UpsertAsync(release, ct);

        if (markLatest)
        {
            await _releaseService.MarkLatestAsync(framework, version, ct);
        }

        _logger.Information("Processed plugin installer release {Version} for framework {Framework} from repo {Repo} (ContentSize={ContentSize})",
            version, framework, repoName, content?.Length ?? 0);
        context.WriteLine("Plugin installer release persisted. Latest={0}, ContentSize={1}", markLatest, content?.Length ?? 0);
    }

    private async Task<byte[]?> DownloadContentAsync(string url, CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "Safeturned-API");
            var response = await client.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsByteArrayAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to download content from {Url}", url);
            return null;
        }
    }
}
