namespace Safeturned.Api.Models;

public record InitiateUploadRequest(
    string FileName,
    long FileSizeBytes,
    string FileHash,
    int TotalChunks
);

public record InitiateUploadResponse(
    string SessionId,
    string Message
);

public record UploadChunkRequest(
    string SessionId,
    int ChunkIndex,
    IFormFile Chunk,
    string ChunkHash
);

public record UploadChunkResponse(
    bool Success,
    string Message
);

public record CompleteUploadRequest(
    string SessionId,
    string? BadgeToken
);

public record UploadStatusResponse(
    string SessionId,
    string FileName,
    int TotalChunks,
    int UploadedChunks,
    double ProgressPercentage,
    bool IsCompleted,
    DateTime ExpiresAt
);
