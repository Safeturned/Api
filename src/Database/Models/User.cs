using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? DiscordId { get; set; }

    [MaxLength(100)]
    public string? DiscordUsername { get; set; }

    [MaxLength(255)]
    public string? DiscordAvatarUrl { get; set; }

    [MaxLength(100)]
    public string? SteamId { get; set; }

    [MaxLength(100)]
    public string? SteamUsername { get; set; }

    [MaxLength(255)]
    public string? SteamAvatarUrl { get; set; }

    [Required]
    public TierType Tier { get; set; } = TierType.Free;

    public DateTime CreatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsAdmin { get; set; } = false;

    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<FileData> ScannedFiles { get; set; } = new List<FileData>();

    public string? Username => DiscordUsername ?? SteamUsername;
    public string? AvatarUrl => DiscordAvatarUrl ?? SteamAvatarUrl;
}

public enum TierType
{
    Free = 0,
    Verified = 1,
    Premium = 2,
    Bot = 3
}