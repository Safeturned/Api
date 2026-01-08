using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

[Queue("badge-analysis")]
public class OfficialBadgeAnalysisJob
{
    private readonly IOfficialBadgeService _officialBadgeService;
    private readonly ILogger _logger;

    public OfficialBadgeAnalysisJob(IOfficialBadgeService officialBadgeService, ILogger logger)
    {
        _officialBadgeService = officialBadgeService;
        _logger = logger.ForContext<OfficialBadgeAnalysisJob>();
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [10, 60, 300])]
    [SentryMonitorSlug("official-badge-analysis")]
    public async Task AnalyzeAsync(PerformContext context, string badgeId, string fileName, byte[] content, string version, CancellationToken ct)
    {
        context.WriteLine("Analyzing official file for badge {0}: {1} {2}", badgeId, fileName, version);

        var badgeHash = await _officialBadgeService.AnalyzeAndUpdateBadgeAsync(badgeId, fileName, content, version, ct);
        if (badgeHash != null)
        {
            context.WriteLine("Badge {0} updated successfully. File hash: {1}", badgeId, badgeHash);
            _logger.Information("Official badge {BadgeId} updated with hash {Hash} for {FileName} {Version}", badgeId, badgeHash, fileName, version);
        }
        else
        {
            context.WriteLine("Warning: Failed to update badge {0}", badgeId);
            _logger.Warning("Failed to update official badge {BadgeId} for {FileName} {Version}", badgeId, fileName, version);
            SentrySdk.CaptureException(new InvalidOperationException($"Failed to update official badge {badgeId} for {fileName} {version}"),
                scope => scope.SetExtras(new Dictionary<string, object?>
                {
                    ["BadgeId"] = badgeId,
                    ["FileName"] = fileName,
                    ["Version"] = version,
                    ["ContentLength"] = content.Length
                }));
        }
    }
}
