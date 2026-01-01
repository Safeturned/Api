using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class DiscordAuthService : IDiscordAuthService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;

    public DiscordAuthService(IServiceScopeFactory serviceScopeFactory, ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<DiscordAuthService>();
    }

    public async Task<User> HandleDiscordCallbackAsync(string discordId, string email, string username, string? avatarUrl)
    {
        var user = await GetOrCreateUserAsync(discordId, email, username, avatarUrl);
        await UpdateLastLoginAsync(user.Id);
        return user;
    }

    public async Task<User> GetOrCreateUserAsync(string discordId, string email, string username, string? avatarUrl)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var existingIdentity = await db.Set<UserIdentity>()
            .Include(ui => ui.User)
            .FirstOrDefaultAsync(ui => ui.Provider == AuthProvider.Discord && ui.ProviderUserId == discordId);

        if (existingIdentity != null)
        {
            existingIdentity.ProviderUsername = username;
            existingIdentity.AvatarUrl = avatarUrl;
            existingIdentity.LastAuthenticatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(email) && existingIdentity.User.Email != email)
            {
                existingIdentity.User.Email = email;
            }

            await db.SaveChangesAsync();
            _logger.Information("Updated existing Discord identity for user {UserId}", existingIdentity.UserId);
            return existingIdentity.User;
        }

        User? userByEmail = null;
        if (!string.IsNullOrEmpty(email))
        {
            userByEmail = await db.Set<User>()
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        User user;
        if (userByEmail != null)
        {
            _logger.Information("Linking Discord identity to existing user {UserId}", userByEmail.Id);
            user = userByEmail;
        }
        else
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Tier = TierType.Free,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                IsAdmin = false
            };

            db.Set<User>().Add(user);
            await db.SaveChangesAsync();
            _logger.Information("Created new user {UserId} from Discord", user.Id);
        }

        var discordIdentity = new UserIdentity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Provider = AuthProvider.Discord,
            ProviderUserId = discordId,
            ProviderUsername = username,
            AvatarUrl = avatarUrl,
            ConnectedAt = DateTime.UtcNow,
            LastAuthenticatedAt = DateTime.UtcNow
        };

        db.Set<UserIdentity>().Add(discordIdentity);
        await db.SaveChangesAsync();

        _logger.Information("Created Discord identity for user {UserId}", user.Id);
        return user;
    }

    public async Task UpdateLastLoginAsync(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var user = await db.Set<User>().FindAsync(userId);
        if (user != null)
        {
            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }
}
