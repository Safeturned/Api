using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class AnalysisJob
{
    [Key]
    public Guid Id { get; set; }

    public AnalysisJobStatus Status { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string FileHash { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    public string? HangfireJobId { get; set; }

    public Guid? UserId { get; set; }
    public Guid? ApiKeyId { get; set; }
    public string? ClientIpAddress { get; set; }
    public bool ForceAnalyze { get; set; }
    public string? BadgeToken { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    public string? ResultJson { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }

    public string? TempFilePath { get; set; }
    public bool TempFileCleanedUp { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [ForeignKey(nameof(ApiKeyId))]
    public ApiKey? ApiKey { get; set; }
}
