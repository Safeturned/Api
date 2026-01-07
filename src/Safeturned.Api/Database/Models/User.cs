using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class User
{
    [Key]
    public Guid Id { get; set; }

    [MaxLength(255)]
    public string? Email { get; set; }

    [Required]
    public TierType Tier { get; set; } = TierType.Free;

    public DateTime CreatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public bool IsActive { get; set; } = true;

    public UserPermission Permissions { get; set; } = UserPermission.None;

    public bool IsAdministrator => Permissions == UserPermission.Administrator;

    public bool HasPermission(UserPermission permission)
    {
        if (IsAdministrator)
            return true;
        return (Permissions & permission) == permission;
    }

    public ICollection<UserIdentity> Identities { get; set; } = new List<UserIdentity>();
    public ICollection<FileAdminReview> FileReviews { get; set; } = new List<FileAdminReview>();
    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<FileData> ScannedFiles { get; set; } = new List<FileData>();

    public string? Username
    {
        get
        {
            var discord = Identities?.FirstOrDefault(i => i.Provider == AuthProvider.Discord);
            var steam = Identities?.FirstOrDefault(i => i.Provider == AuthProvider.Steam);
            return discord?.ProviderUsername ?? steam?.ProviderUsername;
        }
    }

    public string? AvatarUrl
    {
        get
        {
            var discord = Identities?.FirstOrDefault(i => i.Provider == AuthProvider.Discord);
            var steam = Identities?.FirstOrDefault(i => i.Provider == AuthProvider.Steam);
            return discord?.AvatarUrl ?? steam?.AvatarUrl;
        }
    }
}

public enum TierType
{
    Free = 0,
    Verified = 1,
    Premium = 2,
    Bot = 3
}