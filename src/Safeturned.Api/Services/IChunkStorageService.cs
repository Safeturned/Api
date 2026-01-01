using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IChunkStorageService
{
    Task<string> InitiateUploadSessionAsync(string fileName, long fileSizeBytes, string fileHash, int totalChunks, string clientIpAddress, CancellationToken cancellationToken = default);
    Task<bool> StoreChunkAsync(string sessionId, int chunkIndex, IFormFile chunkFile, string chunkHash, CancellationToken cancellationToken = default);
    Task<bool> IsChunkUploadedAsync(string sessionId, int chunkIndex, CancellationToken cancellationToken = default);
    Task<ChunkUploadSession?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default);
    Task<bool> CompleteUploadAsync(string sessionId, CancellationToken cancellationToken = default);
    Task<string?> AssembleFileAsync(string sessionId, CancellationToken cancellationToken = default);
    Task CleanupSessionAsync(string sessionId, CancellationToken cancellationToken = default);
    Task CleanupExpiredSessionsAsync(CancellationToken cancellationToken = default);
    Task<int> GetActiveSessionCountAsync(CancellationToken cancellationToken = default);
}