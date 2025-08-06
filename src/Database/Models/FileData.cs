using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class FileData
{
    [Key] public string Hash { get; set; }
    public int Score { get; set; }
    public string? FileName { get; set; }
    public long SizeBytes { get; set; }
    public string? DetectedType { get; set; }
    public DateTime AddDateTime { get; set; }
    public DateTime LastScanned { get; set; }
    public int TimesScanned { get; set; }
}