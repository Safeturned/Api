using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IFileAdminService
{
    Task<(List<FileData> files, int totalCount)> GetFilesAsync(
        int page,
        int pageSize,
        string? search,
        bool? isTakenDown,
        AdminVerdict? verdict,
        bool? isMalicious,
        string? sortBy,
        string? sortOrder,
        CancellationToken cancellationToken = default);

    Task<FileData?> GetFileWithReviewsAsync(
        string hash,
        CancellationToken cancellationToken = default);

    Task<FileAdminReview> AddReviewAsync(
        string fileHash,
        Guid reviewerId,
        AdminVerdict verdict,
        string? publicMessage,
        string? internalNotes,
        CancellationToken cancellationToken = default);

    Task<FileData?> TakedownFileAsync(
        string hash,
        Guid moderatorId,
        string reason,
        string? publicMessage,
        CancellationToken cancellationToken = default);

    Task<FileData?> RestoreFileAsync(
        string hash,
        Guid moderatorId,
        string? internalNotes,
        CancellationToken cancellationToken = default);

    Task<List<FileAdminReview>> GetReviewHistoryAsync(
        string hash,
        CancellationToken cancellationToken = default);

    Task<(List<FileAdminReview> reviews, int totalCount)> GetAllReviewsAsync(
        int page,
        int pageSize,
        Guid? reviewerId,
        AdminVerdict? verdict,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default);
}
