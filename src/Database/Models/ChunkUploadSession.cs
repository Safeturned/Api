using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class ChunkUploadSession
{
    [Key]
    public string SessionId { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public string FileHash { get; set; } = string.Empty;

    public int TotalChunks { get; set; }

    public bool[] UploadedChunks { get; set; } = [];

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public string ClientIpAddress { get; set; } = string.Empty;

    public bool IsCompleted { get; set; }

    public DateTime? CompletedAt { get; set; }
}
