using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class ScanRecord
{
    [Key] public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FileHash { get; set; }
    public float Score { get; set; }
    public bool IsThreat { get; set; }
    public int ScanTimeMs { get; set; }
    public DateTime ScanDate { get; set; }

    // User tracking (nullable for backward compatibility with anonymous scans)
    public Guid? UserId { get; set; }
    public Guid? ApiKeyId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [ForeignKey(nameof(ApiKeyId))]
    public ApiKey? ApiKey { get; set; }
}