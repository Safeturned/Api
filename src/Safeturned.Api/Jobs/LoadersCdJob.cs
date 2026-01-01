using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class LoadersCdJob
{
    private readonly ILoaderReleaseService _loaderReleaseService;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger _logger;

    public LoadersCdJob(
        ILoaderReleaseService loaderReleaseService,
        IBackgroundJobClient backgroundJobClient,
        IHttpClientFactory httpClientFactory,
        ILogger logger)
    {
        _loaderReleaseService = loaderReleaseService;
        _backgroundJobClient = backgroundJobClient;
        _httpClientFactory = httpClientFactory;
        _logger = logger.ForContext<LoadersCdJob>();
    }

    [SentryMonitorSlug("loaders-cd")]
    public async Task ProcessAsync(PerformContext context, string repoName, string framework, string configuration, string version, string downloadUrl, string sha256, bool markLatest, string? assetName, CancellationToken ct)
    {
        context.WriteLine("Processing loader release {0} {1} {2}", framework, configuration, version);

        var packedVersion = VersionPackingHelper.Pack(version);

        byte[]? content = null;
        string? contentHash = null;

        if (!string.IsNullOrWhiteSpace(downloadUrl))
        {
            context.WriteLine("Downloading loader from {0}", downloadUrl);
            content = await DownloadContentAsync(downloadUrl, ct);

            if (content != null)
            {
                contentHash = HashHelper.ComputeHash(content);
                context.WriteLine("Downloaded {0} bytes, hash: {1}", content.Length, contentHash);
            }
            else
            {
                _logger.Warning("Failed to download loader content from {Url}", downloadUrl);
                context.WriteLine("Warning: Failed to download loader content");
            }
        }

        var release = new LoaderRelease
        {
            Framework = framework,
            Configuration = configuration,
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

        await _loaderReleaseService.UpsertAsync(release, ct);

        if (markLatest)
        {
            await _loaderReleaseService.MarkLatestAsync(framework, configuration, version, ct);
        }

        _logger.Information("Processed loader release {Framework} {Configuration} {Version} from repo {Repo} (ContentSize={ContentSize})",
            framework, configuration, version, repoName, content?.Length ?? 0);
        context.WriteLine("Loader release persisted. Latest={0}, ContentSize={1}", markLatest, content?.Length ?? 0);

        if (content != null && !string.IsNullOrEmpty(assetName))
        {
            _backgroundJobClient.Enqueue<OfficialBadgeAnalysisJob>(job =>
                job.AnalyzeAsync(null!, OfficialBadgeConstants.ModuleLoader, assetName, content, version, CancellationToken.None));
            context.WriteLine("Enqueued badge analysis job for {0}", OfficialBadgeConstants.ModuleLoader);
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
