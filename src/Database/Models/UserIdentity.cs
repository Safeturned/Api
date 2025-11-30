using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class UserIdentity
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    public AuthProvider Provider { get; set; }

    [Required]
    [MaxLength(100)]
    public string ProviderUserId { get; set; } = string.Empty; // Discord ID or numeric Steam ID

    [MaxLength(100)]
    public string? ProviderUsername { get; set; }

    [MaxLength(255)]
    public string? AvatarUrl { get; set; }

    public DateTime ConnectedAt { get; set; }

    public DateTime? LastAuthenticatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}