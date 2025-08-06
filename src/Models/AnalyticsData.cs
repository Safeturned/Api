namespace Safeturned.Api.Models;

public class AnalyticsData
{
    public long                    TotalFilesScanned    { get; set; }
    public long                    TotalThreatsDetected { get; set; }
    public double                  DetectionAccuracy    { get; set; }
    public double                  AverageScanTimeMs    { get; set; }
    public DateTime                LastUpdated          { get; set; }
    public Dictionary<string, int> ThreatsByType        { get; set; } = new();
    public Dictionary<string, int>           ScansByDay { get; set; } = new();
    public long TotalSafeFiles { get; set; }
    public long TotalMaliciousFiles { get; set; }
    public double AverageScore { get; set; }
    public DateTime FirstScanDate { get; set; }
    public DateTime LastScanDate { get; set; }
    public long TotalScanTimeMs { get; set; }
    public double ThreatDetectionRate { get; set; }
} 