namespace Safeturned.Api.Models;

public class InitiateUploadRequest
{
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string FileHash { get; set; } = string.Empty;
    public int TotalChunks { get; set; }
}

public class InitiateUploadResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class UploadChunkRequest
{
    public string SessionId { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public IFormFile Chunk { get; set; } = null!;
    public string ChunkHash { get; set; } = string.Empty;
}

public class UploadChunkResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class CompleteUploadRequest
{
    public string SessionId { get; set; } = string.Empty;
}

public class UploadStatusResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int TotalChunks { get; set; }
    public int UploadedChunks { get; set; }
    public double ProgressPercentage { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime ExpiresAt { get; set; }
}
