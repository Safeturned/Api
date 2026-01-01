using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class FileData
{
    [Key] public string Hash { get; set; } = string.Empty;
    public int Score { get; set; }
    public string? FileName { get; set; }
    public long SizeBytes { get; set; }
    public string? DetectedType { get; set; }
    public DateTime AddDateTime { get; set; }
    public DateTime LastScanned { get; set; }
    public int TimesScanned { get; set; }

    public string? AnalyzerVersion { get; set; }

    public string? AssemblyCompany { get; set; }
    public string? AssemblyProduct { get; set; }
    public string? AssemblyTitle { get; set; }
    public string? AssemblyGuid { get; set; }
    public string? AssemblyCopyright { get; set; }

    // User tracking (nullable for backward compatibility with anonymous scans)
    public Guid? UserId { get; set; }
    public Guid? ApiKeyId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [ForeignKey(nameof(ApiKeyId))]
    public ApiKey? ApiKey { get; set; }
}