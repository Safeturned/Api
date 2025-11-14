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

            var existingUser = _context.Set<User>().FirstOrDefault(u => u.DiscordId == adminDiscordId);
            if (existingUser != null)
            {
                existingUser.IsAdmin = true;
                existingUser.Tier = TierType.Premium;
                _context.SaveChanges();

                _logger.Information("Promoted existing user {UserId} to admin", existingUser.Id);
                return;
            }

            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Email = adminEmail,
                DiscordId = adminDiscordId,
                DiscordUsername = "Admin (Pending Discord Login)",
                Tier = TierType.Premium,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsAdmin = true
            };

            _context.Set<User>().Add(adminUser);
            _context.SaveChanges();

            _logger.Information("Created admin user {UserId}. User must login via Discord to complete setup.", adminUser.Id);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to seed admin user");
        }
    }
}