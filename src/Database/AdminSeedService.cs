using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Database;

public class AdminSeedService
{
    private readonly DbContext _context;
    private readonly ILogger _logger;
    private readonly IConfiguration _config;

    public AdminSeedService(DbContext context, ILogger logger, IConfiguration config)
    {
        _context = context;
        _logger = logger.ForContext<AdminSeedService>();
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
            var adminExists = _context.Set<User>().Any(x => x.IsAdmin);
            if (adminExists)
            {
                _logger.Information("Admin user already exists, skipping seed");
                return;
            }

            var adminEmail = _config.GetRequiredString("AdminSeed:Email");
            var adminDiscordId = _config.GetRequiredString("AdminSeed:DiscordId");

            // Check if a user with this Discord identity already exists
            var existingUserIdentity = _context.Set<UserIdentity>()
                .Include(ui => ui.User)
                .FirstOrDefault(ui => ui.Provider == AuthProvider.Discord && ui.ProviderUserId == adminDiscordId);

            if (existingUserIdentity?.User != null)
            {
                existingUserIdentity.User.IsAdmin = true;
                existingUserIdentity.User.Tier = TierType.Premium;
                _context.SaveChanges();

                _logger.Information("Promoted existing user {UserId} to admin", existingUserIdentity.User.Id);
                return;
            }

            // Create a new admin user (they must login via Discord to activate)
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

            // Create Discord identity for the admin user
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
        }
    }
}
