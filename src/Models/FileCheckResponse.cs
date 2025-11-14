namespace Safeturned.Api.Models;

public record FileCheckResponse(
    string FileName,
    string FileHash,
    float Score,
    bool Checked,
    string Message,
    DateTime ProcessedAt,
    DateTime LastScanned,
    long FileSizeBytes
);