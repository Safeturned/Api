using Hangfire.Console;
using Hangfire.Server;
using Safeturned.Api.Jobs.Helpers;
using Safeturned.Api.Services;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Jobs;

public class ChunkCleanupJob
{
    private readonly IChunkStorageService _chunkStorageService;
    private readonly ILogger _logger;

    public ChunkCleanupJob(IChunkStorageService chunkStorageService, ILogger logger)
    {
        _chunkStorageService = chunkStorageService;
        _logger = logger.ForContext<ChunkCleanupJob>();
    }

    [SkipWhenPreviousJobIsRunning]
    public async Task CleanupExpiredChunksAsync(PerformContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            context.WriteLine("Starting cleanup of expired chunk uploads");

            var activeSessionsBefore = await _chunkStorageService.GetActiveSessionCountAsync(cancellationToken);
            await _chunkStorageService.CleanupExpiredSessionsAsync(cancellationToken);
            var activeSessionsAfter = await _chunkStorageService.GetActiveSessionCountAsync(cancellationToken);

            var cleanedCount = activeSessionsBefore - activeSessionsAfter;

            if (cleanedCount > 0)
            {
                context.WriteLine("Cleaned up {CleanedCount} expired chunk upload sessions. Active sessions: {ActiveSessions}",
                    cleanedCount, activeSessionsAfter);
            }
            else
            {
                context.WriteLine("No expired chunk upload sessions found. Active sessions: {ActiveSessions}", activeSessionsAfter);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.Information("Chunk cleanup job was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error during chunk cleanup job");
        }
    }
}

