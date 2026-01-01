using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Safeturned.FileChecker;

namespace Safeturned.Api.Services;

public class OfficialBadgeService : IOfficialBadgeService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;

    public OfficialBadgeService(
        IServiceScopeFactory serviceScopeFactory,
        IFileCheckingService fileCheckingService,
        IConfiguration configuration,
        ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _fileCheckingService = fileCheckingService;
        _configuration = configuration;
        _logger = logger.ForContext<OfficialBadgeService>();
    }

    public async Task<string?> AnalyzeAndUpdateBadgeAsync(string badgeId, string fileName, byte[] content, string version, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.Information("Processing official file for badge {BadgeId}: {FileName} {Version}", badgeId, fileName, version);

            var fileHash = HashHelper.ComputeHash(content);
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var badge = await filesDb.Set<Badge>()
                .FirstOrDefaultAsync(b => b.Id == badgeId, cancellationToken);
            if (badge == null)
            {
                _logger.Warning("Badge {BadgeId} not found, cannot update", badgeId);
                return null;
            }

            var existingFile = await filesDb.Set<FileData>()
                .FirstOrDefaultAsync(x => x.Hash == fileHash, cancellationToken);
            if (existingFile != null)
            {
                _logger.Information("File {FileName} already exists with hash {Hash}, updating badge", fileName, fileHash);

                badge.LinkedFileHash = fileHash;
                badge.UpdatedAt = DateTime.UtcNow;
                badge.VersionUpdateCount++;
                await filesDb.SaveChangesAsync(cancellationToken);

                return fileHash;
            }

            using var memoryStream = new MemoryStream(content);
            var canProcess = await _fileCheckingService.CanProcessFileAsync(memoryStream, cancellationToken);

            if (!canProcess)
            {
                _logger.Warning("File {FileName} is not a valid .NET assembly, cannot analyze", fileName);
                return null;
            }

            memoryStream.Position = 0;
            var processingContext = await _fileCheckingService.CheckFileAsync(memoryStream, cancellationToken);

            memoryStream.Position = 0;
            var assemblyMetadata = AssemblyMetadataHelper.ExtractMetadata(memoryStream);

            var fileData = new FileData
            {
                Hash = fileHash,
                Score = (int)processingContext.Score,
                FileName = fileName,
                SizeBytes = content.Length,
                DetectedType = "Assembly",
                AddDateTime = DateTime.UtcNow,
                LastScanned = DateTime.UtcNow,
                TimesScanned = 1,
                UserId = badge.UserId,
                AnalyzerVersion = Checker.Version,
                AssemblyCompany = assemblyMetadata.Company,
                AssemblyProduct = assemblyMetadata.Product,
                AssemblyTitle = assemblyMetadata.Title,
                AssemblyGuid = assemblyMetadata.Guid,
                AssemblyCopyright = assemblyMetadata.Copyright
            };

            await filesDb.Set<FileData>().AddAsync(fileData, cancellationToken);

            badge.LinkedFileHash = fileHash;
            badge.UpdatedAt = DateTime.UtcNow;
            badge.VersionUpdateCount++;
            badge.TrackedFileName = fileName;
            badge.TrackedAssemblyCompany = assemblyMetadata.Company;
            badge.TrackedAssemblyProduct = assemblyMetadata.Product;
            badge.TrackedAssemblyGuid = assemblyMetadata.Guid;

            await filesDb.SaveChangesAsync(cancellationToken);

            _logger.Information("Successfully analyzed {FileName} (Score: {Score}) and updated badge {BadgeId}",
                fileName, processingContext.Score, badgeId);

            return fileHash;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to analyze and update badge {BadgeId} for file {FileName}", badgeId, fileName);
            SentrySdk.CaptureException(ex, x =>
            {
                x.SetExtra("badgeId", badgeId);
                x.SetExtra("fileName", fileName);
            });
            return null;
        }
    }
}
