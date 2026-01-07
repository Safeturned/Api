using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class AnalysisJobCleanupJob
{
    private readonly IAnalysisJobService _analysisJobService;

    public AnalysisJobCleanupJob(IAnalysisJobService analysisJobService)
    {
        _analysisJobService = analysisJobService;
    }

    [SentryMonitorSlug("analysis-job-cleanup")]
    [SkipWhenPreviousJobIsRunning]
    public async Task CleanupExpiredJobsAsync(PerformContext context, CancellationToken cancellationToken = default)
    {
        context.WriteLine("Starting cleanup of expired analysis jobs");

        await _analysisJobService.CleanupExpiredJobsAsync(cancellationToken);

        context.WriteLine("Completed cleanup of expired analysis jobs");
    }
}
