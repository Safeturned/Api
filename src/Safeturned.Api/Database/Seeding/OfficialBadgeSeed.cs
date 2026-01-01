using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Database.Seeding;

public class OfficialBadgeSeed
{
    private readonly DbContext _context;
    private readonly ILogger _logger;
    private readonly IConfiguration _config;

    public OfficialBadgeSeed(DbContext context, ILogger logger, IConfiguration config)
    {
        _context = context;
        _logger = logger.ForContext<OfficialBadgeSeed>();
        _config = config;
    }

    /// <summary>
    /// Seeds badges for official Safeturned components (ModuleLoader, PluginInstaller, Plugin).
    /// These badges are owned by the admin user and use tokens for secure auto-updates.
    /// </summary>
    public void SeedOfficialBadges()
    {
        try
        {
            var adminDiscordId = _config.GetRequiredString("AdminSeed:DiscordId");
            var adminIdentity = _context.Set<UserIdentity>()
                .Include(x => x.User)
                .FirstOrDefault(x => x.Provider == AuthProvider.Discord && x.ProviderUserId == adminDiscordId);
            var admin = adminIdentity?.User;
            if (admin == null)
            {
                _logger.Warning("No admin user found with Discord ID {DiscordId}, cannot seed official badges", adminDiscordId);
                return;
            }

            SeedBadge(admin, OfficialBadgeConstants.ModuleLoader, "ModuleLoader", "OfficialBadges:ModuleLoaderToken", "Official Safeturned ModuleLoader - Verified safe by Safeturned");
            SeedBadge(admin, OfficialBadgeConstants.ModulePluginInstaller, "ModulePluginInstaller", "OfficialBadges:ModulePluginInstallerToken", "Official Safeturned Module Plugin Installer - Verified safe by Safeturned");
            SeedBadge(admin, OfficialBadgeConstants.ModulePlugin, "ModulePlugin", "OfficialBadges:ModulePluginToken", "Official Safeturned Module Plugin - Verified safe by Safeturned");

            _context.SaveChanges();
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to seed official badges");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to seed official badges"));
        }
    }

    private void SeedBadge(User admin, string badgeId, string badgeName, string tokenConfigKey, string description)
    {
        var existingBadge = _context.Set<Badge>().FirstOrDefault(x => x.Id == badgeId);
        if (existingBadge != null)
        {
            _logger.Information("Official badge {BadgeId} already exists, skipping", badgeId);
            return;
        }

        var configToken = _config[tokenConfigKey];
        string plainToken;
        string salt;
        string hashedToken;

        if (!string.IsNullOrEmpty(configToken))
        {
            plainToken = configToken;
            salt = BadgeTokenHelper.GenerateSalt();
            hashedToken = BadgeTokenHelper.HashToken(plainToken, salt);
            _logger.Information("Using configured token for badge {BadgeId}", badgeId);
        }
        else
        {
            plainToken = BadgeTokenHelper.GenerateToken();
            salt = BadgeTokenHelper.GenerateSalt();
            hashedToken = BadgeTokenHelper.HashToken(plainToken, salt);
            _logger.Warning("Generated new token for badge {BadgeId}. Token: {Token} - Please save this!", badgeId, plainToken);
        }

        var badge = new Badge
        {
            Id = badgeId,
            UserId = admin.Id,
            Name = $"Safeturned {badgeName}",
            Description = description,
            LinkedFileHash = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UpdateSalt = salt,
            UpdateToken = hashedToken,
            RequireTokenForUpdate = true,
            VersionUpdateCount = 0
        };

        _context.Set<Badge>().Add(badge);
        _logger.Information("Created official badge {BadgeId} for {BadgeName}", badgeId, badgeName);
    }
}
