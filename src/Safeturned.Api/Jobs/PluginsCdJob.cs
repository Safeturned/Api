using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

[Queue("cd-pipeline")]
public class PluginsCdJob
{
    private readonly IPluginReleaseService _pluginReleaseService;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger _logger;

    public PluginsCdJob(
        IPluginReleaseService pluginReleaseService,
        IBackgroundJobClient backgroundJobClient,
        IHttpClientFactory httpClientFactory,
        ILogger logger)
    {
        _pluginReleaseService = pluginReleaseService;
        _backgroundJobClient = backgroundJobClient;
        _httpClientFactory = httpClientFactory;
        _logger = logger.ForContext<PluginsCdJob>();
    }

    [AutomaticRetry(Attempts = 5, DelaysInSeconds = [30, 120, 300, 900, 1800])]
    [SentryMonitorSlug("plugins-cd")]
    public async Task ProcessAsync(PerformContext context, string repoName, string framework, string version, string downloadUrl, string sha256, bool markLatest, string? assetName, CancellationToken ct)
    {
        context.WriteLine("Processing plugin release {0} {1}", framework, version);

        var packedVersion = VersionPackingHelper.Pack(version);

        byte[]? content = null;
        string? contentHash = null;

        if (!string.IsNullOrWhiteSpace(downloadUrl))
        {
            context.WriteLine("Downloading plugin from {0}", downloadUrl);
            content = await DownloadContentAsync(downloadUrl, ct);

            if (content != null)
            {
                contentHash = HashHelper.ComputeHash(content);
                context.WriteLine("Downloaded {0} bytes, hash: {1}", content.Length, contentHash);
            }
            else
            {
                _logger.Warning("Failed to download plugin content from {Url}", downloadUrl);
                context.WriteLine("Warning: Failed to download plugin content");
            }
        }

        var release = new PluginRelease
        {
            Framework = framework,
            Version = version,
            PackedVersion = packedVersion,
            DownloadUrl = downloadUrl,
            Sha256 = sha256,
            SourceRepo = repoName,
            AssetName = assetName,
            IsLatest = markLatest,
            Content = content,
            ContentHash = contentHash
        };

        await _pluginReleaseService.UpsertAsync(release, ct);

        if (markLatest)
        {
            await _pluginReleaseService.MarkLatestAsync(framework, version, ct);
        }

        _logger.Information("Processed plugin release {Framework} {Version} from repo {Repo} (ContentSize={ContentSize})",
            framework, version, repoName, content?.Length ?? 0);
        context.WriteLine("Plugin release persisted. Latest={0}, ContentSize={1}", markLatest, content?.Length ?? 0);

        if (content != null && !string.IsNullOrEmpty(assetName))
        {
            _backgroundJobClient.Enqueue<OfficialBadgeAnalysisJob>(job =>
                job.AnalyzeAsync(null!, OfficialBadgeConstants.ModulePlugin, assetName, content, version, CancellationToken.None));
            context.WriteLine("Enqueued badge analysis job for {0}", OfficialBadgeConstants.ModulePlugin);
        }
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