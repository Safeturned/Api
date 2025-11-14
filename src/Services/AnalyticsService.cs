using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Models;

namespace Safeturned.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;
    private readonly IDistributedCache _cache;
    private const string AnalyticsCacheKey = "analytics_data";
    private const int CacheExpirationMinutes = 5;

    public AnalyticsService(
        IServiceScopeFactory serviceScopeFactory,
        ILogger logger,
        IDistributedCache cache)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<AnalyticsService>();
        _cache = cache;
    }

    public async Task RecordScanAsync(string fileName, string? fileHash, float score, bool isThreat, TimeSpan scanTime, Guid? userId = null, Guid? apiKeyId = null, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var scanRecord = new ScanRecord
            {
                FileName = fileName,
                FileHash = fileHash,
                Score = score,
                IsThreat = isThreat,
                ScanTimeMs = (int)scanTime.TotalMilliseconds,
                ScanDate = DateTime.UtcNow,
                UserId = userId,
                ApiKeyId = apiKeyId
            };

            await filesDb.Set<ScanRecord>().AddAsync(scanRecord, cancellationToken);
            await filesDb.SaveChangesAsync(cancellationToken);

            await _cache.RemoveAsync(AnalyticsCacheKey, cancellationToken);

            _logger.Information("Recorded scan: {FileName}, Score: {Score}, Threat: {IsThreat}, Time: {ScanTime}ms, UserId: {UserId}",
                fileName, score, isThreat, scanTime.TotalMilliseconds, userId);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to record scan analytics");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to record scan analytics"));
        }
    }

    public async Task<AnalyticsData> GetAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        var cachedDataBytes = await _cache.GetAsync(AnalyticsCacheKey, cancellationToken);
        if (cachedDataBytes != null)
        {
            var cachedData = JsonSerializer.Deserialize<AnalyticsData>(cachedDataBytes);
            if (cachedData != null)
            {
                return cachedData;
            }
        }

        var data = await CalculateAnalyticsAsync(cancellationToken: cancellationToken);

        var dataBytes = JsonSerializer.SerializeToUtf8Bytes(data);
        await _cache.SetAsync(
            AnalyticsCacheKey,
            dataBytes,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(CacheExpirationMinutes)
            },
            cancellationToken);

        return data;
    }

    public async Task<AnalyticsData> GetAnalyticsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        return await CalculateAnalyticsAsync(from, to, cancellationToken);
    }

    public async Task UpdateAnalyticsCacheAsync(CancellationToken cancellationToken = default)
    {
        await _cache.RemoveAsync(AnalyticsCacheKey, cancellationToken);
        await GetAnalyticsAsync(cancellationToken);
    }

    private async Task<AnalyticsData> CalculateAnalyticsAsync(DateTime? from = null, DateTime? to = null, CancellationToken cancellationToken = default)
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

            analytics.TotalFilesScanned = await query.CountAsync(cancellationToken);
            analytics.TotalThreatsDetected = await query.Where(r => r.IsThreat).CountAsync(cancellationToken);
            analytics.TotalSafeFiles = await query.Where(r => !r.IsThreat).CountAsync(cancellationToken);

            if (analytics.TotalFilesScanned > 0)
            {
                analytics.ThreatDetectionRate = (double)analytics.TotalThreatsDetected / analytics.TotalFilesScanned * 100;

                analytics.AverageScanTimeMs = await query.AverageAsync(r => r.ScanTimeMs, cancellationToken);
                analytics.TotalScanTimeMs = await query.SumAsync(r => r.ScanTimeMs, cancellationToken);
                analytics.AverageScore = await query.AverageAsync(r => r.Score, cancellationToken);

                analytics.FirstScanDate = await query.MinAsync(r => r.ScanDate, cancellationToken);
                analytics.LastScanDate = await query.MaxAsync(r => r.ScanDate, cancellationToken);
            }
            else
            {
                analytics.AverageScanTimeMs = 0;
                analytics.TotalScanTimeMs = 0;
                analytics.AverageScore = 0;
            }

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to calculate analytics");
            SentrySdk.CaptureException(ex, scope => scope.SetExtra("message", "Failed to calculate analytics"));

            return new AnalyticsData { LastUpdated = DateTime.UtcNow };
        }
    }
}