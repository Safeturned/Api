using Safeturned.Api.Database;
using Safeturned.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Safeturned.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AnalyticsService> _logger;
    private readonly IMemoryCache _cache;
    private const string AnalyticsCacheKey = "analytics_data";
    private const int CacheExpirationMinutes = 5;

    public AnalyticsService(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<AnalyticsService> logger,
        IMemoryCache cache)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
        _cache = cache;
    }

    public async Task RecordScanAsync(string fileName, float score, bool isThreat, TimeSpan scanTime)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            
            // Record scan metrics in a separate table
            var scanRecord = new ScanRecord
            {
                FileName = fileName,
                Score = score,
                IsThreat = isThreat,
                ScanTimeMs = (int)scanTime.TotalMilliseconds,
                ScanDate = DateTime.UtcNow
            };
            
            filesDb.Set<ScanRecord>().Add(scanRecord);
            await filesDb.SaveChangesAsync();
            
            // Invalidate cache to force refresh
            _cache.Remove(AnalyticsCacheKey);
            
            _logger.LogInformation("Recorded scan: {FileName}, Score: {Score}, Threat: {IsThreat}, Time: {ScanTime}ms",
                fileName, score, isThreat, scanTime.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record scan analytics");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to record scan analytics"));
        }
    }

    public async Task<AnalyticsData> GetAnalyticsAsync()
    {
        // Try to get from cache first
        if (_cache.TryGetValue(AnalyticsCacheKey, out AnalyticsData? cachedData))
        {
            return cachedData!;
        }

        // Calculate fresh data for ALL TIME
        var data = await CalculateAnalyticsAsync();
        
        // Cache the result
        _cache.Set(AnalyticsCacheKey, data, TimeSpan.FromMinutes(CacheExpirationMinutes));
        
        return data;
    }

    public async Task<AnalyticsData> GetAnalyticsAsync(DateTime from, DateTime to)
    {
        // For date range queries, don't use cache - always calculate fresh
        return await CalculateAnalyticsAsync(from, to);
    }

    public async Task UpdateAnalyticsCacheAsync()
    {
        _cache.Remove(AnalyticsCacheKey);
        await GetAnalyticsAsync(); // This will recalculate and cache
    }

    private async Task<AnalyticsData> CalculateAnalyticsAsync(DateTime? from = null, DateTime? to = null)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            
            var query = filesDb.Set<ScanRecord>().AsQueryable();
            
            if (from.HasValue)
                query = query.Where(r => r.ScanDate >= from.Value);
            if (to.HasValue)
                query = query.Where(r => r.ScanDate <= to.Value);

            var analytics = new AnalyticsData
            {
                LastUpdated = DateTime.UtcNow
            };

            // Basic counts
            analytics.TotalFilesScanned = await query.CountAsync();
            analytics.TotalThreatsDetected = await query.Where(r => r.IsThreat).CountAsync();
            analytics.TotalSafeFiles = await query.Where(r => !r.IsThreat).CountAsync();
            analytics.TotalMaliciousFiles = analytics.TotalThreatsDetected;

            // Calculate threat detection rate
            if (analytics.TotalFilesScanned > 0)
            {
                analytics.ThreatDetectionRate = (double)analytics.TotalThreatsDetected / analytics.TotalFilesScanned * 100;
                analytics.DetectionAccuracy = analytics.ThreatDetectionRate; // For backward compatibility
            }

            // Scan time statistics
            var avgScanTime = await query.AverageAsync(r => r.ScanTimeMs);
            analytics.AverageScanTimeMs = avgScanTime;
            analytics.TotalScanTimeMs = await query.SumAsync(r => r.ScanTimeMs);

            // Average score
            var avgScore = await query.AverageAsync(r => r.Score);
            analytics.AverageScore = avgScore;

            // Date range statistics
            if (analytics.TotalFilesScanned > 0)
            {
                analytics.FirstScanDate = await query.MinAsync(r => r.ScanDate);
                analytics.LastScanDate = await query.MaxAsync(r => r.ScanDate);
            }

            // Threats by type (based on score ranges)
            analytics.ThreatsByType = await query
                .Where(r => r.IsThreat)
                .GroupBy(r => GetThreatType(r.Score))
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            // Scans by day (last 30 days for trending)
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            analytics.ScansByDay = await query
                .Where(r => r.ScanDate >= thirtyDaysAgo)
                .GroupBy(r => r.ScanDate.Date)
                .ToDictionaryAsync(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count());

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate analytics");
            SentrySdk.CaptureException(ex, scope =>
            {
                scope.SetExtra("message", "Failed to calculate analytics");
                scope.SetExtra("service", "AnalyticsService");
                scope.SetExtra("operation", "CalculateAnalytics");
                scope.SetTag("component", "Analytics");
                scope.SetTag("operation", "calculate_analytics");
            });
            
            return new AnalyticsData { LastUpdated = DateTime.UtcNow };
        }
    }

    private static string GetThreatType(float score)
    {
        return score switch
        {
            >= 80 => "High Risk",
            >= 60 => "Medium Risk",
            >= 40 => "Low Risk",
            >= 20 => "Suspicious",
            _ => "Safe"
        };
    }
}

// Database model for scan records
public class ScanRecord
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public float Score { get; set; }
    public bool IsThreat { get; set; }
    public int ScanTimeMs { get; set; }
    public DateTime ScanDate { get; set; }
} 