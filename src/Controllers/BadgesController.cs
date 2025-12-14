using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/badges")]
[ApiController]
[Authorize]
public class BadgesController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;

    public BadgesController(
        IServiceScopeFactory serviceScopeFactory,
        ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<BadgesController>();
    }

    [HttpGet]
    public async Task<IActionResult> GetUserBadges()
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badges = await filesDb.Set<Badge>()
                .AsNoTracking()
                .Include(b => b.LinkedFile)
                .Where(b => b.UserId == userId.Value)
                .OrderByDescending(b => b.UpdatedAt)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.Description,
                    b.CreatedAt,
                    b.UpdatedAt,
                    LinkedFile = b.LinkedFile != null ? new
                    {
                        b.LinkedFile.Hash,
                        b.LinkedFile.FileName,
                        b.LinkedFile.Score,
                        b.LinkedFile.LastScanned
                    } : null
                })
                .ToListAsync();

            return Ok(badges);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving badges for user");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error retrieving badges for user"));
            return StatusCode(500, new { error = "Failed to retrieve badges" });
        }
    }

    [HttpGet("{badgeId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBadge(string badgeId)
    {
        try
        {
            _logger.Debug("Looking up badge with ID: {BadgeId}", badgeId);

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .AsNoTracking()
                .Include(b => b.LinkedFile)
                .FirstOrDefaultAsync(b => b.Id == badgeId);

            if (badge == null)
            {
                _logger.Warning("Badge not found for ID: {BadgeId}", badgeId);
                return NotFound(new { error = "Badge not found" });
            }

            _logger.Debug("Badge found: {BadgeId}, Name: {BadgeName}", badge.Id, badge.Name);

            return Ok(new
            {
                badge.Id,
                badge.Name,
                badge.Description,
                badge.CreatedAt,
                badge.UpdatedAt,
                badge.LinkedFileHash,
                badge.RequireTokenForUpdate,
                badge.VersionUpdateCount,
                LinkedFile = badge.LinkedFile != null ? new
                {
                    badge.LinkedFile.Hash,
                    badge.LinkedFile.FileName,
                    badge.LinkedFile.Score,
                    badge.LinkedFile.LastScanned
                } : null
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error retrieving badge {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error retrieving badge"));
            return StatusCode(500, new { error = "Failed to retrieve badge" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateBadge([FromBody] CreateBadgeRequest request)
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            var trimmedName = request.Name?.Trim();
            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { error = "Badge name cannot be empty or whitespace" });

            if (trimmedName.Length > 200)
                return BadRequest(new { error = "Badge name cannot exceed 200 characters" });

            var trimmedDescription = request.Description?.Trim();
            if (trimmedDescription != null && trimmedDescription.Length > 500)
                return BadRequest(new { error = "Description cannot exceed 500 characters" });

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var fileData = await filesDb.Set<FileData>()
                .FirstOrDefaultAsync(f => f.Hash == request.FileHash && f.UserId == userId.Value);

            if (fileData == null)
                return NotFound(new { error = "File not found or you don't have access to it" });

            var badgeId = $"badge_{Guid.NewGuid():N}".Substring(0, 20);

            var plainToken = BadgeTokenHelper.GenerateToken();
            var salt = BadgeTokenHelper.GenerateSalt();
            var hashedToken = BadgeTokenHelper.HashToken(plainToken, salt);

            var badge = new Badge
            {
                Id = badgeId,
                UserId = userId.Value,
                Name = trimmedName,
                Description = string.IsNullOrWhiteSpace(trimmedDescription) ? null : trimmedDescription,
                LinkedFileHash = request.FileHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TrackedAssemblyCompany = fileData.AssemblyCompany,
                TrackedAssemblyProduct = fileData.AssemblyProduct,
                TrackedAssemblyGuid = fileData.AssemblyGuid,
                TrackedFileName = fileData.FileName,
                UpdateSalt = salt,
                UpdateToken = hashedToken,
                RequireTokenForUpdate = request.EnableAutoUpdate ?? false
            };

            await filesDb.Set<Badge>().AddAsync(badge);
            await filesDb.SaveChangesAsync();

            _logger.Information("Badge {BadgeId} created by user {UserId} with auto-update: {AutoUpdate}",
                badgeId, userId.Value, badge.RequireTokenForUpdate);

            return Created($"/v1.0/badges/{badge.Id}", new
            {
                badge.Id,
                badge.Name,
                badge.Description,
                badge.CreatedAt,
                badge.UpdatedAt,
                badge.RequireTokenForUpdate,
                // NB! Token is only returned once during creation!
                UpdateToken = plainToken,
                LinkedFile = new
                {
                    fileData.Hash,
                    fileData.FileName,
                    fileData.Score,
                    fileData.LastScanned
                }
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error creating badge");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error creating badge"));
            return StatusCode(500, new { error = "Failed to create badge" });
        }
    }

    [HttpPut("{badgeId}")]
    public async Task<IActionResult> UpdateBadge(string badgeId, [FromBody] UpdateBadgeRequest request)
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            if (request.Name != null)
            {
                var trimmedName = request.Name.Trim();
                if (string.IsNullOrWhiteSpace(trimmedName))
                    return BadRequest(new { error = "Badge name cannot be empty or whitespace" });

                if (trimmedName.Length > 200)
                    return BadRequest(new { error = "Badge name cannot exceed 200 characters" });
            }

            if (request.Description != null)
            {
                var trimmedDescription = request.Description.Trim();
                if (trimmedDescription.Length > 500)
                    return BadRequest(new { error = "Description cannot exceed 500 characters" });
            }

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId.Value);

            if (badge == null)
                return NotFound(new { error = "Badge not found" });

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var trimmedName = request.Name.Trim();
                badge.Name = trimmedName;
            }

            if (request.Description != null)
            {
                var trimmedDescription = request.Description.Trim();
                badge.Description = string.IsNullOrWhiteSpace(trimmedDescription) ? null : trimmedDescription;
            }

            if (!string.IsNullOrWhiteSpace(request.NewFileHash))
            {
                var fileData = await filesDb.Set<FileData>()
                    .FirstOrDefaultAsync(f => f.Hash == request.NewFileHash && f.UserId == userId.Value);

                if (fileData == null)
                    return NotFound(new { error = "New file not found or you don't have access to it" });

                badge.LinkedFileHash = request.NewFileHash;
            }

            badge.UpdatedAt = DateTime.UtcNow;
            await filesDb.SaveChangesAsync();

            _logger.Information("Badge {BadgeId} updated by user {UserId}", badgeId, userId.Value);

            var updatedBadge = await filesDb.Set<Badge>()
                .AsNoTracking()
                .Include(b => b.LinkedFile)
                .FirstOrDefaultAsync(b => b.Id == badgeId);

            return Ok(new
            {
                updatedBadge!.Id,
                updatedBadge.Name,
                updatedBadge.Description,
                updatedBadge.CreatedAt,
                updatedBadge.UpdatedAt,
                LinkedFile = updatedBadge.LinkedFile != null ? new
                {
                    updatedBadge.LinkedFile.Hash,
                    updatedBadge.LinkedFile.FileName,
                    updatedBadge.LinkedFile.Score,
                    updatedBadge.LinkedFile.LastScanned
                } : null
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error updating badge {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error updating badge"));
            return StatusCode(500, new { error = "Failed to update badge" });
        }
    }

    [HttpDelete("{badgeId}")]
    public async Task<IActionResult> DeleteBadge(string badgeId)
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId.Value);

            if (badge == null)
                return NotFound(new { error = "Badge not found" });

            filesDb.Set<Badge>().Remove(badge);
            await filesDb.SaveChangesAsync();

            _logger.Information("Badge {BadgeId} deleted by user {UserId}", badgeId, userId.Value);

            return Ok(new { message = "Badge deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error deleting badge {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error deleting badge"));
            return StatusCode(500, new { error = "Failed to delete badge" });
        }
    }

    [HttpPost("{badgeId}/regenerate-token")]
    public async Task<IActionResult> RegenerateToken(string badgeId)
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId.Value);

            if (badge == null)
                return NotFound(new { error = "Badge not found" });

            var plainToken = BadgeTokenHelper.GenerateToken();
            var salt = BadgeTokenHelper.GenerateSalt();
            var hashedToken = BadgeTokenHelper.HashToken(plainToken, salt);

            badge.UpdateSalt = salt;
            badge.UpdateToken = hashedToken;
            badge.UpdatedAt = DateTime.UtcNow;

            await filesDb.SaveChangesAsync();

            _logger.Information("Badge {BadgeId} token regenerated by user {UserId}", badgeId, userId.Value);

            return Ok(new
            {
                message = "Token regenerated successfully",
                updateToken = plainToken
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error regenerating token for badge {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error regenerating token"));
            return StatusCode(500, new { error = "Failed to regenerate token" });
        }
    }

    [HttpPost("{badgeId}/toggle-auto-update")]
    public async Task<IActionResult> ToggleAutoUpdate(string badgeId, [FromBody] ToggleAutoUpdateRequest request)
    {
        try
        {
            var (userId, _) = HttpContext.GetUserContext();
            if (userId == null)
                return Unauthorized();

            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId.Value);

            if (badge == null)
                return NotFound(new { error = "Badge not found" });

            badge.RequireTokenForUpdate = request.Enabled;
            badge.UpdatedAt = DateTime.UtcNow;

            await filesDb.SaveChangesAsync();

            _logger.Information("Badge {BadgeId} auto-update toggled to {Enabled} by user {UserId}",
                badgeId, request.Enabled, userId.Value);

            return Ok(new
            {
                message = "Auto-update setting updated",
                requireTokenForUpdate = badge.RequireTokenForUpdate
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error toggling auto-update for badge {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error toggling auto-update"));
            return StatusCode(500, new { error = "Failed to toggle auto-update" });
        }
    }
}

public record CreateBadgeRequest(
    [Required(ErrorMessage = "Badge name is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Badge name must be between 1 and 200 characters")]
    string Name,

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    string? Description,

    [Required(ErrorMessage = "File hash is required")]
    string FileHash,

    bool? EnableAutoUpdate
);

public record UpdateBadgeRequest(
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Badge name must be between 1 and 200 characters")]
    string? Name,

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    string? Description,

    string? NewFileHash
);
public record ToggleAutoUpdateRequest(bool Enabled);