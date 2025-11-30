using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class Badge
{
    [Key]
    [MaxLength(50)]
    public string Id { get; set; } = string.Empty; // e.g., "badge_a8f3k9d2"

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // User-friendly name like "MyPlugin v1.0"

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public string LinkedFileHash { get; set; } = string.Empty;

    // Secure token-based auto-update system
    // UpdateToken: SHA256(plainToken + UpdateSalt) for security
    // UpdateSalt: Random salt to prevent rainbow table attacks
    // Users provide the plain token when uploading - only matching tokens can update this badge
    [MaxLength(64)]
    public string? UpdateSalt { get; set; }  // Random salt for token hashing

    [MaxLength(64)]
    public string? UpdateToken { get; set; }  // Hashed token for security

    public bool RequireTokenForUpdate { get; set; } = false;  // If true, uploads must provide matching token

    // Assembly metadata tracking (informational only, not used for security)
    public string? TrackedAssemblyCompany { get; set; }
    public string? TrackedAssemblyProduct { get; set; }
    public string? TrackedAssemblyGuid { get; set; }
    public string? TrackedFileName { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Track version history
    public int VersionUpdateCount { get; set; } = 0; // How many times the badge auto-updated

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(LinkedFileHash))]
    public FileData LinkedFile { get; set; } = null!;
}