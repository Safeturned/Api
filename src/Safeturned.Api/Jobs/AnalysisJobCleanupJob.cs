using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

[Queue("critical")]
public class AnalysisJobCleanupJob
{
    private readonly IAnalysisJobService _analysisJobService;

    public AnalysisJobCleanupJob(IAnalysisJobService analysisJobService)
    {
        _analysisJobService = analysisJobService;
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = [60, 300])]
    [SentryMonitorSlug("analysis-job-cleanup")]
    [SkipWhenPreviousJobIsRunning]
    public async Task CleanupExpiredJobsAsync(PerformContext context, CancellationToken cancellationToken = default)
    {
        context.WriteLine("Starting cleanup of expired analysis jobs");

        await _analysisJobService.CleanupExpiredJobsAsync(cancellationToken);

        context.WriteLine("Completed cleanup of expired analysis jobs");
    }
}
