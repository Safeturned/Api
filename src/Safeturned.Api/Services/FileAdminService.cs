using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class FileAdminService : IFileAdminService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;

    public FileAdminService(IServiceScopeFactory serviceScopeFactory, ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<FileAdminService>();
    }

    public async Task<(List<FileData> files, int totalCount)> GetFilesAsync(
        int page,
        int pageSize,
        string? search,
        bool? isTakenDown,
        AdminVerdict? verdict,
        bool? isMalicious,
        string? sortBy,
        string? sortOrder,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var query = db.Set<FileData>()
            .Include(f => f.User)
            .Include(f => f.TakenDownByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            query = query.Where(f =>
                (f.FileName != null && f.FileName.ToLower().Contains(searchLower)) ||
                f.Hash.ToLower().Contains(searchLower));
        }

        if (isTakenDown.HasValue)
            query = query.Where(f => f.IsTakenDown == isTakenDown.Value);

        if (verdict.HasValue)
            query = query.Where(f => f.CurrentVerdict == verdict.Value);

        if (isMalicious.HasValue)
            query = isMalicious.Value
                ? query.Where(f => f.Score >= 50)
                : query.Where(f => f.Score < 50);

        var totalCount = await query.CountAsync(cancellationToken);

        query = (sortBy?.ToLower(), sortOrder?.ToLower()) switch
        {
            ("filename", "asc") => query.OrderBy(f => f.FileName),
            ("filename", "desc") => query.OrderByDescending(f => f.FileName),
            ("score", "asc") => query.OrderBy(f => f.Score),
            ("score", "desc") => query.OrderByDescending(f => f.Score),
            ("verdict", "asc") => query.OrderBy(f => f.CurrentVerdict),
            ("verdict", "desc") => query.OrderByDescending(f => f.CurrentVerdict),
            ("takendown", "asc") => query.OrderBy(f => f.TakenDownAt),
            ("takendown", "desc") => query.OrderByDescending(f => f.TakenDownAt),
            _ => query.OrderByDescending(f => f.LastScanned)
        };

        var files = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (files, totalCount);
    }

    public async Task<FileData?> GetFileWithReviewsAsync(
        string hash,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<FileData>()
            .Include(f => f.User)
            .Include(f => f.TakenDownByUser)
            .Include(f => f.AdminReviews)
                .ThenInclude(r => r.Reviewer)
            .FirstOrDefaultAsync(f => f.Hash == hash, cancellationToken);
    }

    public async Task<FileAdminReview> AddReviewAsync(
        string fileHash,
        Guid reviewerId,
        AdminVerdict verdict,
        string? publicMessage,
        string? internalNotes,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var file = await db.Set<FileData>().FirstOrDefaultAsync(f => f.Hash == fileHash, cancellationToken);
        if (file == null)
            throw new InvalidOperationException($"File {fileHash} not found");

        var review = new FileAdminReview
        {
            Id = Guid.NewGuid(),
            FileHash = fileHash,
            ReviewerId = reviewerId,
            Verdict = verdict,
            PublicMessage = publicMessage,
            InternalNotes = internalNotes,
            CreatedAt = DateTime.UtcNow
        };

        db.Set<FileAdminReview>().Add(review);

        file.CurrentVerdict = verdict;
        if (!string.IsNullOrEmpty(publicMessage))
            file.PublicAdminMessage = publicMessage;

        await db.SaveChangesAsync(cancellationToken);

        _logger.Information("Admin {ReviewerId} added review for file {FileHash} with verdict {Verdict}",
            reviewerId, fileHash, verdict);

        return review;
    }

    public async Task<FileData?> TakedownFileAsync(
        string hash,
        Guid moderatorId,
        string reason,
        string? publicMessage,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var file = await db.Set<FileData>().FirstOrDefaultAsync(f => f.Hash == hash, cancellationToken);
        if (file == null)
            return null;

        file.IsTakenDown = true;
        file.TakenDownAt = DateTime.UtcNow;
        file.TakenDownByUserId = moderatorId;
        file.TakedownReason = reason;
        file.CurrentVerdict = AdminVerdict.TakenDown;

        if (!string.IsNullOrEmpty(publicMessage))
            file.PublicAdminMessage = publicMessage;

        var review = new FileAdminReview
        {
            Id = Guid.NewGuid(),
            FileHash = hash,
            ReviewerId = moderatorId,
            Verdict = AdminVerdict.TakenDown,
            PublicMessage = publicMessage,
            InternalNotes = $"Takedown reason: {reason}",
            CreatedAt = DateTime.UtcNow
        };

        db.Set<FileAdminReview>().Add(review);
        await db.SaveChangesAsync(cancellationToken);

        _logger.Warning("File {FileHash} taken down by {ModeratorId}. Reason: {Reason}",
            hash, moderatorId, reason);

        return file;
    }

    public async Task<FileData?> RestoreFileAsync(
        string hash,
        Guid moderatorId,
        string? internalNotes,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var file = await db.Set<FileData>().FirstOrDefaultAsync(f => f.Hash == hash, cancellationToken);
        if (file == null)
            return null;

        var previousVerdict = file.CurrentVerdict;

        file.IsTakenDown = false;
        file.TakenDownAt = null;
        file.TakedownReason = null;
        file.CurrentVerdict = AdminVerdict.None;

        var review = new FileAdminReview
        {
            Id = Guid.NewGuid(),
            FileHash = hash,
            ReviewerId = moderatorId,
            Verdict = AdminVerdict.None,
            InternalNotes = $"Restored from takedown. Previous verdict: {previousVerdict}. {internalNotes}",
            CreatedAt = DateTime.UtcNow
        };

        db.Set<FileAdminReview>().Add(review);
        await db.SaveChangesAsync(cancellationToken);

        _logger.Warning("File {FileHash} restored by {ModeratorId}", hash, moderatorId);

        return file;
    }

    public async Task<List<FileAdminReview>> GetReviewHistoryAsync(
        string hash,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        return await db.Set<FileAdminReview>()
            .Include(r => r.Reviewer)
            .Where(r => r.FileHash == hash)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<(List<FileAdminReview> reviews, int totalCount)> GetAllReviewsAsync(
        int page,
        int pageSize,
        Guid? reviewerId,
        AdminVerdict? verdict,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var query = db.Set<FileAdminReview>()
            .Include(r => r.Reviewer)
            .Include(r => r.File)
            .AsQueryable();

        if (reviewerId.HasValue)
            query = query.Where(r => r.ReviewerId == reviewerId.Value);

        if (verdict.HasValue)
            query = query.Where(r => r.Verdict == verdict.Value);

        if (from.HasValue)
            query = query.Where(r => r.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(r => r.CreatedAt <= to.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (reviews, totalCount);
    }
}
