using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public interface IAnalyticsService
{
    /// <summary>
    /// Records a file scan with its results
    /// </summary>
    Task RecordScanAsync(string fileName, float score, bool isThreat, TimeSpan scanTime);
    
    /// <summary>
    /// Gets the current analytics data
    /// </summary>
    Task<AnalyticsData> GetAnalyticsAsync();
    
    /// <summary>
    /// Gets analytics for a specific time period
    /// </summary>
    Task<AnalyticsData> GetAnalyticsAsync(DateTime from, DateTime to);
    
    /// <summary>
    /// Updates the analytics cache
    /// </summary>
    Task UpdateAnalyticsCacheAsync();
} 