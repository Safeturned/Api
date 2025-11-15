using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/admin")]
[Authorize(Policy = KnownAuthPolicies.AdminOnly)]
public class AdminController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger _logger;

    public AdminController(
        IServiceScopeFactory serviceScopeFactory,
        IApiKeyService apiKeyService,
        ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _apiKeyService = apiKeyService;
        _logger = logger.ForContext<AdminController>();
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] TierType? tier = null,
        [FromQuery] bool? isAdmin = null)
    {
        if (page < 1)
            page = 1;
        if (pageSize < 1 || pageSize > 100)
            pageSize = 50;

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var query = filesDb.Set<User>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(x =>
                x.Email.ToLower().Contains(searchLower) ||
                x.Identities.Any(i => i.ProviderUsername != null && i.ProviderUsername.ToLower().Contains(searchLower)));
        }

        if (tier.HasValue)
        {
            query = query.Where(u => u.Tier == tier.Value);
        }

        if (isAdmin.HasValue)
        {
            query = query.Where(u => u.IsAdmin == isAdmin.Value);
        }

        var totalUsers = await query.CountAsync();
        var users = await query
            .Include(u => u.Identities)
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.Email,
                Username = x.Username,
                AvatarUrl = x.AvatarUrl,
                x.Tier,
                x.IsAdmin,
                x.IsActive,
                x.CreatedAt,
                x.LastLoginAt,
                ApiKeysCount = x.ApiKeys.Count,
                ScannedFilesCount = x.ScannedFiles.Count
            })
            .ToListAsync();

        _logger.Information("Admin {AdminId} retrieved {Count} users (page {Page})",
            User.FindFirst("user_id")?.Value, users.Count, page);

        return Ok(new
        {
            page,
            pageSize,
            totalUsers,
            totalPages = (int)Math.Ceiling(totalUsers / (double)pageSize),
            users
        });
    }

    [HttpGet("users/{userId:guid}")]
    public async Task<IActionResult> GetUserDetails(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var user = await db.Set<User>()
            .Include(u => u.Identities)
            .Include(u => u.ApiKeys)
            .Include(u => u.ScannedFiles)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        _logger.Information("Admin {AdminId} viewed details for user {UserId}",
            User.FindFirst("user_id")?.Value, userId);

        return Ok(new
        {
            user.Id,
            user.Email,
            user.Username,
            user.AvatarUrl,
            linkedIdentities = user.Identities.Select(i => new
            {
                ProviderName = i.Provider.ToString(),
                ProviderId = (int)i.Provider,
                i.ProviderUserId,
                i.ProviderUsername,
                i.ConnectedAt,
                i.LastAuthenticatedAt
            }),
            user.Tier,
            user.IsAdmin,
            user.IsActive,
            user.CreatedAt,
            user.LastLoginAt,
            apiKeys = user.ApiKeys.Select(k => new
            {
                k.Id,
                k.Name,
                k.IsActive,
                k.CreatedAt,
                k.LastUsedAt
            }),
            scannedFiles = user.ScannedFiles.Select(f => new
            {
                hash = f.Hash,
                f.FileName,
                isMalicious = f.Score >= 50,
                uploadedAt = f.AddDateTime
            }).Take(10)
        });
    }

    [HttpPatch("users/{userId:guid}/tier")]
    public async Task<IActionResult> UpdateUserTier(Guid userId, [FromBody] UpdateTierRequest request)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var oldTier = user.Tier;
        user.Tier = request.Tier;
        await db.SaveChangesAsync();

        _logger.Information("Admin {AdminId} updated user {UserId} tier from {OldTier} to {NewTier}",
            User.FindFirst("user_id")?.Value, userId, oldTier, request.Tier);

        return Ok(new
        {
            userId,
            tier = user.Tier,
            message = $"User tier updated from {oldTier} to {user.Tier}"
        });
    }

    [HttpPost("users/{userId:guid}/grant-admin")]
    public async Task<IActionResult> GrantAdmin(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (user.IsAdmin)
        {
            return BadRequest(new { error = "User is already an admin" });
        }

        user.IsAdmin = true;
        await db.SaveChangesAsync();

        _logger.Warning("Admin {AdminId} granted admin status to user {UserId} ({Email})",
            User.FindFirst("user_id")?.Value, userId, user.Email);

        return Ok(new
        {
            userId,
            isAdmin = user.IsAdmin,
            message = "Admin status granted successfully"
        });
    }

    [HttpDelete("users/{userId:guid}/revoke-admin")]
    public async Task<IActionResult> RevokeAdmin(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (!user.IsAdmin)
        {
            return BadRequest(new { error = "User is not an admin" });
        }

        var currentUserId = User.FindFirst("user_id")?.Value;
        if (currentUserId == userId.ToString())
        {
            return BadRequest(new { error = "Cannot revoke your own admin status" });
        }

        user.IsAdmin = false;
        await db.SaveChangesAsync();

        _logger.Warning("Admin {AdminId} revoked admin status from user {UserId} ({Email})",
            currentUserId, userId, user.Email);

        return Ok(new
        {
            userId,
            isAdmin = user.IsAdmin,
            message = "Admin status revoked successfully"
        });
    }

    [HttpGet("analytics/system")]
    public async Task<IActionResult> GetSystemAnalytics()
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var totalUsers = await db.Set<User>().CountAsync();
        var activeUsers = await db.Set<User>().CountAsync(u => u.IsActive);
        var adminUsers = await db.Set<User>().CountAsync(u => u.IsAdmin);

        var usersByTier = await db.Set<User>()
            .GroupBy(u => u.Tier)
            .Select(g => new { tier = g.Key, count = g.Count() })
            .ToListAsync();

        var totalScans = await db.Set<FileData>().CountAsync();
        var maliciousScans = await db.Set<FileData>().CountAsync(f => f.Score >= 50);
        var cleanScans = await db.Set<FileData>().CountAsync(f => f.Score < 50);

        var totalApiKeys = await db.Set<ApiKey>().CountAsync();
        var activeApiKeys = await db.Set<ApiKey>().CountAsync(k => k.IsActive);

        var recentUsers = await db.Set<User>()
            .Include(u => u.Identities)
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new
            {
                u.Id,
                u.Email,
                Username = u.Username,
                u.Tier,
                u.CreatedAt
            })
            .ToListAsync();

        var recentScans = await db.Set<FileData>()
            .Include(f => f.User)
            .ThenInclude(u => u!.Identities)
            .OrderByDescending(f => f.AddDateTime)
            .Take(10)
            .Select(f => new
            {
                hash = f.Hash,
                f.FileName,
                isMalicious = f.Score >= 50,
                uploadedAt = f.AddDateTime,
                userId = f.User != null ? f.User.Id : (Guid?)null,
                username = f.User != null ? f.User.Username : null
            })
            .ToListAsync();

        _logger.Information("Admin {AdminId} accessed system analytics", User.FindFirst("user_id")?.Value);

        return Ok(new
        {
            users = new
            {
                total = totalUsers,
                active = activeUsers,
                admins = adminUsers,
                byTier = usersByTier
            },
            scans = new
            {
                total = totalScans,
                malicious = maliciousScans,
                clean = cleanScans
            },
            apiKeys = new
            {
                total = totalApiKeys,
                active = activeApiKeys
            },
            recent = new
            {
                users = recentUsers,
                scans = recentScans
            }
        });
    }

    [HttpPatch("users/{userId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var currentUserId = User.FindFirst("user_id")?.Value;
        if (currentUserId == userId.ToString() && user.IsActive)
        {
            return BadRequest(new { error = "Cannot deactivate your own account" });
        }

        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();

        _logger.Warning("Admin {AdminId} {Action} user {UserId} ({Email})",
            currentUserId,
            user.IsActive ? "activated" : "deactivated",
            userId,
            user.Email);

        return Ok(new
        {
            userId,
            isActive = user.IsActive,
            message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully"
        });
    }

    [HttpPost("users/{userId:guid}/api-keys")]
    public async Task<IActionResult> CreateBotApiKey(Guid userId, [FromBody] CreateBotApiKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await db.Set<User>().FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = $"User {userId} not found" });
        }

        try
        {
            var prefix = request.Prefix ?? ApiKeyConstants.LivePrefix;
            var scopes = request.Scopes != null && request.Scopes.Any()
                ? string.Join(",", request.Scopes)
                : ApiKeyConstants.DefaultScopes;

            var tier = request.Tier ?? TierType.Bot;
            var requestsPerHour = request.RequestsPerHour ?? (tier == TierType.Bot ? int.MaxValue : 1000);

            var (apiKey, plainTextKey) = await _apiKeyService.GenerateApiKeyWithCustomTierAsync(
                userId,
                request.Name,
                prefix,
                request.ExpiresAt,
                scopes,
                request.IpWhitelist,
                tier,
                requestsPerHour
            );

            _logger.Information("Admin created API key {ApiKeyId} for user {UserId} with tier {Tier}",
                apiKey.Id, userId, tier);

            return Ok(new
            {
                id = apiKey.Id,
                name = apiKey.Name,
                key = plainTextKey,
                maskedKey = $"{apiKey.Prefix}_...{apiKey.LastSixChars}",
                createdAt = apiKey.CreatedAt,
                expiresAt = apiKey.ExpiresAt,
                scopes = apiKey.Scopes.Split(','),
                ipWhitelist = apiKey.IpWhitelist,
                rateLimitTier = apiKey.RateLimitTier,
                requestsPerHour = apiKey.RequestsPerHour,
                warning = "Save this key securely. It will not be shown again!"
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error creating bot API key for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to create API key", message = ex.Message });
        }
    }
}

public record UpdateTierRequest(TierType Tier);

public record CreateBotApiKeyRequest(
    string Name,
    string? Prefix,
    DateTime? ExpiresAt,
    string[]? Scopes,
    string? IpWhitelist,
    TierType? Tier,
    int? RequestsPerHour
);