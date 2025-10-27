using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;

namespace Safeturned.Api.Jobs;

public class AnalyticsCacheUpdateJob
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsCacheUpdateJob(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [SkipWhenPreviousJobIsRunning]
    public async Task UpdateAnalyticsCache(PerformContext context, CancellationToken cancellationToken)
    {
        try
        {
            context.WriteLine("Starting analytics cache update");
            
            await _analyticsService.UpdateAnalyticsCacheAsync(cancellationToken);
            
            context.WriteLine("Analytics cache updated successfully");
        }
        catch (Exception ex)
        {
            context.WriteLine("Error occured on update analytics cache");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to update analytics cache"));
        }
    }
} 