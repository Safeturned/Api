using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Database.Seeding;

public class AdminSeed
{
    private readonly DbContext _context;
    private readonly ILogger _logger;
    private readonly IConfiguration _config;

    public AdminSeed(DbContext context, ILogger logger, IConfiguration config)
    {
        _context = context;
        _logger = logger.ForContext<AdminSeed>();
        _config = config;
    }

    /// <summary>
    /// Seeds an initial admin user if no admin exists
    /// This should be called on application startup
    /// </summary>
    public void SeedAdminUser()
    {
        try
        {
            var adminEmail = _config.GetRequiredString("AdminSeed:Email");
            var adminDiscordId = _config.GetRequiredString("AdminSeed:DiscordId");
            var existingUserIdentity = _context.Set<UserIdentity>()
                .Include(x => x.User)
                .FirstOrDefault(x => x.Provider == AuthProvider.Discord && x.ProviderUserId == adminDiscordId);
            if (existingUserIdentity?.User != null)
            {
                if (existingUserIdentity.User.IsAdmin)
                {
                    _logger.Information("Configured admin user {UserId} already exists, skipping seed", existingUserIdentity.User.Id);
                    return;
                }

                existingUserIdentity.User.IsAdmin = true;
                existingUserIdentity.User.Tier = TierType.Premium;
                _context.SaveChanges();

                _logger.Warning("Re-promoted user {UserId} to admin (admin status was missing)", existingUserIdentity.User.Id);
                return;
            }

            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Email = adminEmail,
                Tier = TierType.Premium,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsAdmin = true
            };

            _context.Set<User>().Add(adminUser);
            _context.SaveChanges();

            var discordIdentity = new UserIdentity
            {
                Id = Guid.NewGuid(),
                UserId = adminUser.Id,
                Provider = AuthProvider.Discord,
                ProviderUserId = adminDiscordId,
                ConnectedAt = DateTime.UtcNow
            };

            _context.Set<UserIdentity>().Add(discordIdentity);
            _context.SaveChanges();

            _logger.Information("Created admin user {UserId} with Discord identity {DiscordId}. Admin account is ready.", adminUser.Id, adminDiscordId);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to seed admin user");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to seed admin user"));
        }
    }
}
