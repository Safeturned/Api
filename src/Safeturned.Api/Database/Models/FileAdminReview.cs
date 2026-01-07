using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class FileAdminReview
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string FileHash { get; set; } = string.Empty;

    [Required]
    public Guid ReviewerId { get; set; }

    public AdminVerdict Verdict { get; set; }

    public string? PublicMessage { get; set; }

    public string? InternalNotes { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(FileHash))]
    public FileData File { get; set; } = null!;

    [ForeignKey(nameof(ReviewerId))]
    public User Reviewer { get; set; } = null!;
}

public enum AdminVerdict
{
    None = 0,
    Trusted = 1,
    Harmful = 2,
    Suspicious = 3,
    Malware = 4,
    PUP = 5,
    FalsePositive = 6,
    TakenDown = 7
}
