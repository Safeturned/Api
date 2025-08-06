namespace Safeturned.Api.Models;

public class AnalyticsData
{
    public long TotalFilesScanned { get; set; }
    public long TotalThreatsDetected { get; set; }
    public double DetectionAccuracy { get; set; }
    public double AverageScanTimeMs { get; set; }
    public DateTime LastUpdated { get; set; }
    public long TotalSafeFiles { get; set; }
    public double AverageScore { get; set; }
    public DateTime FirstScanDate { get; set; }
    public DateTime LastScanDate { get; set; }
    public long TotalScanTimeMs { get; set; }
    public double ThreatDetectionRate { get; set; }
}