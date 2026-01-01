using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;
using Safeturned.Api.Services;
using Safeturned.FileChecker;
using Safeturned.FileChecker.Modules;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/files")]
[ApiController]
[ApiSecurityFilter]
public class FilesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IFileCheckingService _fileCheckingService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;

    public FilesController(
        IServiceScopeFactory serviceScopeFactory,
        IFileCheckingService fileCheckingService,
        IAnalyticsService analyticsService,
        ILogger logger,
        IConfiguration configuration)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _fileCheckingService = fileCheckingService;
        _analyticsService = analyticsService;
        _logger = logger.ForContext<FilesController>();
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> UploadFile(IFormFile file, bool forceAnalyze, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (!string.Equals(Path.GetExtension(file.FileName), FileConstants.AllowedExtension, StringComparison.OrdinalIgnoreCase))
            return BadRequest(FileConstants.ErrorMessageInvalidExtension);

        try
        {
            _logger.Information("Processing uploaded file: {FileName}, Size: {Size} bytes",
                file.FileName, file.Length);

            var scanStartTime = DateTime.UtcNow;

            var fileHash = HashHelper.ComputeHash(file);

            bool canProcess;
            await using (var stream = file.OpenReadStream())
            {
                canProcess = await _fileCheckingService.CanProcessFileAsync(stream, cancellationToken);
            }

            if (!canProcess)
            {
                _logger.Warning("File {FileName} is not a valid .NET assembly", file.FileName);
                return Ok(new FileCheckResponse(
                    file.FileName,
                    fileHash,
                    0,
                    false,
                    ResponseMessageType.FileNotDotNetAssembly,
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    file.Length,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                ));
            }
            var (userId, apiKeyId) = HttpContext.GetUserContext();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            Guid? validUserId = null;
            if (userId.HasValue)
            {
                var userExists = await filesDb.Set<User>().AnyAsync(u => u.Id == userId.Value, cancellationToken);
                if (userExists)
                {
                    validUserId = userId;
                }
                else
                {
                    _logger.Warning("User {UserId} from token does not exist in database, skipping user association", userId.Value);
                }
            }

            var existingFile = await filesDb.Set<FileData>().FirstOrDefaultAsync(x => x.Hash == fileHash, cancellationToken);
            FileData fileData;
            if (existingFile == null)
            {
                IModuleProcessingContext processingContext;
                AssemblyMetadata assemblyMetadata;
                await using (var checkStream = file.OpenReadStream())
                {
                    processingContext = await _fileCheckingService.CheckFileAsync(checkStream, cancellationToken);
                }

                await using (var metadataStream = file.OpenReadStream())
                {
                    assemblyMetadata = AssemblyMetadataHelper.ExtractMetadata(metadataStream);
                }

                fileData = new FileData
                {
                    Hash = fileHash,
                    Score = (int)processingContext.Score,
                    FileName = file.FileName,
                    SizeBytes = file.Length,
                    DetectedType = "Assembly",
                    AddDateTime = DateTime.UtcNow,
                    LastScanned = DateTime.UtcNow,
                    TimesScanned = 1,
                    UserId = validUserId,
                    ApiKeyId = apiKeyId,
                    AnalyzerVersion = Checker.Version,
                    AssemblyCompany = assemblyMetadata.Company,
                    AssemblyProduct = assemblyMetadata.Product,
                    AssemblyTitle = assemblyMetadata.Title,
                    AssemblyGuid = assemblyMetadata.Guid,
                    AssemblyCopyright = assemblyMetadata.Copyright
                };

                await filesDb.Set<FileData>().AddAsync(fileData, cancellationToken);
                await filesDb.SaveChangesAsync(cancellationToken);

                var badgeToken = Request.Form["badgeToken"].FirstOrDefault();
                if (!string.IsNullOrEmpty(badgeToken) && validUserId.HasValue)
                {
                    var badges = await filesDb.Set<Badge>()
                        .Where(b => b.UserId == validUserId.Value &&
                                   b.RequireTokenForUpdate == true &&
                                   b.UpdateToken != null)
                        .ToListAsync(cancellationToken);

                    foreach (var badge in badges)
                    {
                        if (BadgeTokenHelper.VerifyToken(badgeToken, badge.UpdateToken!, badge.UpdateSalt))
                        {
                            _logger.Information("Badge {BadgeId} auto-updating via token to hash {Hash}",
                                badge.Id, fileData.Hash);
                            badge.LinkedFileHash = fileData.Hash;
                            badge.UpdatedAt = DateTime.UtcNow;
                            badge.VersionUpdateCount++;
                        }
                    }

                    if (badges.Any())
                    {
                        await filesDb.SaveChangesAsync(cancellationToken);
                    }
                }

                var scanTime = DateTime.UtcNow - scanStartTime;
                var isThreat = processingContext.Score >= 50;

                await _analyticsService.RecordScanAsync(file.FileName, fileHash, processingContext.Score, isThreat, scanTime, validUserId, apiKeyId, cancellationToken);

                _logger.Information("New file {FileName} processed successfully. Score: {Score}, Time: {ScanTime}ms",
                    file.FileName, processingContext.Score, scanTime.TotalMilliseconds);

                return Ok(new FileCheckResponse(
                    file.FileName,
                    fileData.Hash,
                    processingContext.Score,
                    true,
                    ResponseMessageType.NewFileProcessedSuccessfully,
                    DateTime.UtcNow,
                    fileData.LastScanned,
                    file.Length,
                    fileData.AnalyzerVersion,
                    null,
                    fileData.AssemblyCompany,
                    fileData.AssemblyProduct,
                    fileData.AssemblyTitle,
                    fileData.AssemblyGuid,
                    fileData.AssemblyCopyright
                ));
            }
            if (!forceAnalyze)
            {
                existingFile.TimesScanned++;
                if (validUserId.HasValue && !existingFile.UserId.HasValue)
                {
                    existingFile.UserId = validUserId;
                    existingFile.ApiKeyId = apiKeyId;
                }

                await filesDb.SaveChangesAsync(cancellationToken);

                if (validUserId.HasValue)
                {
                    var scanTime = DateTime.UtcNow - scanStartTime;
                    var isThreat = existingFile.Score >= 50;
                    await _analyticsService.RecordScanAsync(existingFile.FileName ?? file.FileName, fileHash, existingFile.Score, isThreat, scanTime, validUserId, apiKeyId, cancellationToken);
                }

                _logger.Information("File {FileName} already exists. Returning existing record without re-analysis.",
                    file.FileName);

                return Ok(new FileCheckResponse(
                    existingFile.FileName ?? file.FileName,
                    existingFile.Hash,
                    existingFile.Score,
                    false,
                    ResponseMessageType.FileAlreadyUploadedSkippedAnalysis,
                    DateTime.UtcNow,
                    existingFile.LastScanned,
                    existingFile.SizeBytes,
                    existingFile.AnalyzerVersion,
                    null,
                    existingFile.AssemblyCompany,
                    existingFile.AssemblyProduct,
                    existingFile.AssemblyTitle,
                    existingFile.AssemblyGuid,
                    existingFile.AssemblyCopyright
                ));
            }

            IModuleProcessingContext reProcessingContext;
            AssemblyMetadata reAssemblyMetadata;
            await using (var checkStream = file.OpenReadStream())
            {
                reProcessingContext = await _fileCheckingService.CheckFileAsync(checkStream);
            }

            await using (var metadataStream = file.OpenReadStream())
            {
                reAssemblyMetadata = AssemblyMetadataHelper.ExtractMetadata(metadataStream);
            }

            existingFile.Score = (int)reProcessingContext.Score;
            existingFile.FileName = file.FileName;
            existingFile.SizeBytes = file.Length;
            existingFile.LastScanned = DateTime.UtcNow;
            existingFile.TimesScanned++;
            existingFile.AnalyzerVersion = Checker.Version;
            existingFile.AssemblyCompany = reAssemblyMetadata.Company;
            existingFile.AssemblyProduct = reAssemblyMetadata.Product;
            existingFile.AssemblyTitle = reAssemblyMetadata.Title;
            existingFile.AssemblyGuid = reAssemblyMetadata.Guid;
            existingFile.AssemblyCopyright = reAssemblyMetadata.Copyright;
            if (validUserId.HasValue && !existingFile.UserId.HasValue)
            {
                existingFile.UserId = validUserId;
                existingFile.ApiKeyId = apiKeyId;
            }

            await filesDb.SaveChangesAsync(cancellationToken);

            var reScanTime = DateTime.UtcNow - scanStartTime;
            var reIsThreat = reProcessingContext.Score >= 50;

            await _analyticsService.RecordScanAsync(file.FileName, fileHash, reProcessingContext.Score, reIsThreat, reScanTime, validUserId, apiKeyId, cancellationToken);

            _logger.Information("File {FileName} re-analyzed successfully. Score: {Score}, Time: {ScanTime}ms", file.FileName, reProcessingContext.Score, reScanTime.TotalMilliseconds);

            return Ok(new FileCheckResponse(
                existingFile.FileName,
                existingFile.Hash,
                reProcessingContext.Score,
                true,
                ResponseMessageType.FileReanalyzedSuccessfully,
                DateTime.UtcNow,
                existingFile.LastScanned,
                existingFile.SizeBytes,
                existingFile.AnalyzerVersion,
                null,
                existingFile.AssemblyCompany,
                existingFile.AssemblyProduct,
                existingFile.AssemblyTitle,
                existingFile.AssemblyGuid,
                existingFile.AssemblyCopyright
            ));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error processing file {FileName}", file.FileName);
            throw;
        }
    }

    [HttpGet("{hash}")]
    public async Task<IActionResult> GetFileResult(string hash, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>().AsNoTracking().FirstOrDefaultAsync(x => x.Hash == hash, cancellationToken);
            if (fileData == null)
                return NotFound($"File with hash {hash} not found.");
            return Ok(new FileCheckResponse(
                fileData.FileName ?? "Unknown",
                fileData.Hash,
                fileData.Score,
                true,
                ResponseMessageType.FileRetrievedFromDatabase,
                default,
                fileData.LastScanned,
                fileData.SizeBytes,
                fileData.AnalyzerVersion,
                null,
                fileData.AssemblyCompany,
                fileData.AssemblyProduct,
                fileData.AssemblyTitle,
                fileData.AssemblyGuid,
                fileData.AssemblyCopyright
            ));
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving file result for hash {Hash}", hash);
            throw;
        }
    }

    [HttpGet("version")]
    public IActionResult GetAnalyzerVersion()
    {
        return Ok(new { version = Checker.Version });
    }

    [HttpGet("filename/{filename}")]
    public async Task<IActionResult> GetFileByFilename(string filename, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>()
                .AsNoTracking()
                .Where(x => x.FileName == filename)
                .OrderByDescending(x => x.LastScanned)
                .FirstOrDefaultAsync(cancellationToken);

            if (fileData == null)
                return NotFound($"File with name {filename} not found.");

            return Ok(fileData);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving file by filename {FileName}", filename);
            throw;
        }
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _analyticsService.GetAnalyticsAsync(cancellationToken);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving analytics");
            throw;
        }
    }

    [HttpGet("analytics/range")]
    [Authorize(Policy = KnownAuthPolicies.AdminOnly)]
    public async Task<IActionResult> GetAnalyticsWithDateRange([FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _analyticsService.GetAnalyticsAsync(from, to, cancellationToken);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving analytics with date range");
            throw;
        }
    }
}