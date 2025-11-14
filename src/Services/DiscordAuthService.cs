using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class DiscordAuthService : IDiscordAuthService
{
    private readonly FilesDbContext _context;
    private readonly ILogger _logger;

    public DiscordAuthService(FilesDbContext context, ILogger logger)
    {
        _context = context;
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
        var existingUser = await _context.Set<User>().FirstOrDefaultAsync(u => u.DiscordId == discordId);
        if (existingUser != null)
        {
            existingUser.Email = email;
            existingUser.DiscordUsername = username;
            existingUser.DiscordAvatarUrl = avatarUrl;
            await _context.SaveChangesAsync();

            _logger.Information("Updated existing user {UserId} from Discord", existingUser.Id);
            return existingUser;
        }

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DiscordId = discordId,
            DiscordUsername = username,
            DiscordAvatarUrl = avatarUrl,
            Tier = TierType.Free,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            IsAdmin = false
        };

        _context.Set<User>().Add(newUser);
        await _context.SaveChangesAsync();

        _logger.Information("Created new user {UserId} from Discord", newUser.Id);
        return newUser;
    }

    public async Task UpdateLastLoginAsync(Guid userId)
    {
        var user = await _context.Set<User>().FindAsync(userId);
        if (user != null)
        {
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
