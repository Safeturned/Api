using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class ApiKey
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(255)]
    public string KeyHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Prefix { get; set; } = "sk_live"; // sk_live or sk_test

    [MaxLength(10)]
    public string LastSixChars { get; set; } = string.Empty; // For display (masked)

    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public DateTime? LastUsedAt { get; set; }

    [Required]
    public TierType RateLimitTier { get; set; } = TierType.Free;

    public int RequestsPerHour { get; set; } = 60;

    public bool IsActive { get; set; } = true;

    // Permission scopes (JSON array stored as string)
    [MaxLength(500)]
    public string Scopes { get; set; } = "read,analyze"; // read, analyze, runtime-scan

    // IP whitelist (comma-separated, null = any IP)
    [MaxLength(1000)]
    public string? IpWhitelist { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<ApiKeyUsage> UsageRecords { get; set; } = new List<ApiKeyUsage>();
}
