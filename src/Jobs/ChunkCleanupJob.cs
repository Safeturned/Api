using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class ChunkCleanupJob
{
    private readonly IChunkStorageService _chunkStorageService;

    public ChunkCleanupJob(IChunkStorageService chunkStorageService)
    {
        _chunkStorageService = chunkStorageService;
    }

    [SentryMonitorSlug("chunk-cleanup")]
    [SkipWhenPreviousJobIsRunning]
    public async Task CleanupExpiredChunksAsync(PerformContext context, CancellationToken cancellationToken = default)
    {
        context.WriteLine("Starting cleanup of expired chunk uploads");

        var activeSessionsBefore = await _chunkStorageService.GetActiveSessionCountAsync(cancellationToken);
        await _chunkStorageService.CleanupExpiredSessionsAsync(cancellationToken);
        var activeSessionsAfter = await _chunkStorageService.GetActiveSessionCountAsync(cancellationToken);

        var cleanedCount = activeSessionsBefore - activeSessionsAfter;

        if (cleanedCount > 0)
        {
            context.WriteLine("Cleaned up {0} expired chunk upload sessions. Active sessions: {1}",
                cleanedCount, activeSessionsAfter);
        }
        else
        {
            context.WriteLine("No expired chunk upload sessions found. Active sessions: {0}", activeSessionsAfter);
        }
    }
}