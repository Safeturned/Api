using Hangfire;
using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class FileAnalysisJob
{
    private readonly IAnalysisJobService _analysisJobService;

    public FileAnalysisJob(IAnalysisJobService analysisJobService)
    {
        _analysisJobService = analysisJobService;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [10, 60, 300])]
    [SentryMonitorSlug("file-analysis")]
    public async Task ProcessAsync(Guid jobId, PerformContext context, CancellationToken cancellationToken = default)
    {
        context.WriteLine($"Processing analysis job: {jobId}");

        try
        {
            await _analysisJobService.ProcessJobAsync(jobId, cancellationToken);
            context.WriteLine($"Job {jobId} completed successfully");
        }
        catch (Exception ex)
        {
            context.WriteLine($"Job {jobId} failed: {ex.Message}");
            throw;
        }
    }
}
