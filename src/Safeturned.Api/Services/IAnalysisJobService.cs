using Safeturned.Api.Database.Models;
using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public interface IAnalysisJobService
{
    Task<AnalysisJob> CreateJobAsync(
        Stream fileStream,
        string fileName,
        long fileSize,
        Guid? userId,
        Guid? apiKeyId,
        string clientIpAddress,
        bool forceAnalyze,
        string? badgeToken,
        CancellationToken cancellationToken = default);

    Task EnqueueJobAsync(AnalysisJob job, CancellationToken cancellationToken = default);

    Task<AnalysisJob?> GetJobAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task<AnalysisJob?> WaitForCompletionAsync(
        Guid jobId,
        TimeSpan timeout,
        CancellationToken cancellationToken = default);

    Task ProcessJobAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task CleanupExpiredJobsAsync(CancellationToken cancellationToken = default);

    FileCheckResponse? DeserializeResult(string? resultJson);
}
