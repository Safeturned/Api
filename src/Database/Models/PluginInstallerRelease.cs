using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class PluginInstallerRelease
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Framework { get; set; } = default!;

    [Required]
    [MaxLength(50)]
    public string Version { get; set; } = default!;

    public uint PackedVersion { get; set; }

    [MaxLength(512)]
    public string? DownloadUrl { get; set; }

    [MaxLength(128)]
    public string? Sha256 { get; set; }

    [MaxLength(100)]
    public string? SourceRepo { get; set; }

    [MaxLength(200)]
    public string? AssetName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsLatest { get; set; }

    public byte[]? Content { get; set; }

    [MaxLength(128)]
    public string? ContentHash { get; set; }
}
