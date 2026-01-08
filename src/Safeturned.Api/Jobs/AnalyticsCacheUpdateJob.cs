using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

[Queue("critical")]
public class AnalyticsCacheUpdateJob
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsCacheUpdateJob(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = [60, 300])]
    [SentryMonitorSlug("analytics-cache")]
    [SkipWhenPreviousJobIsRunning]
    public async Task UpdateAnalyticsCache(PerformContext context, CancellationToken cancellationToken)
    {
        context.WriteLine("Starting analytics cache update");

        await _analyticsService.UpdateAnalyticsCacheAsync(cancellationToken);

        context.WriteLine("Analytics cache updated successfully");
    }
}