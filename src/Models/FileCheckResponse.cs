namespace Safeturned.Api.Models;

public class FileCheckResponse
{
    public string FileName { get; set; } = string.Empty;
    public string FileHash { get; set; }
    public float Score { get; set; }
    public bool Checked { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime ProcessedAt { get; set; }
    public DateTime LastScanned { get; set; }
    public long FileSizeBytes { get; set; }
}