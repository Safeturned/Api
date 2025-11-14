using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public interface IAnalyticsService
{
    /// <summary>
    /// Records a file scan with its results
    /// </summary>
    Task RecordScanAsync(string fileName, string? fileHash, float score, bool isThreat, TimeSpan scanTime, Guid? userId = null, Guid? apiKeyId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets the current analytics data
    /// </summary>
    Task<AnalyticsData> GetAnalyticsAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets analytics for a specific time period
    /// </summary>
    Task<AnalyticsData> GetAnalyticsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Updates the analytics cache
    /// </summary>
    Task UpdateAnalyticsCacheAsync(CancellationToken cancellationToken = default);
} 