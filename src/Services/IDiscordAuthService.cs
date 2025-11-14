using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface IDiscordAuthService
{
    /// <summary>
    /// Handles Discord OAuth callback and creates/updates user
    /// </summary>
    Task<User> HandleDiscordCallbackAsync(string discordId, string email, string username, string? avatarUrl);

    /// <summary>
    /// Gets or creates user from Discord information
    /// </summary>
    Task<User> GetOrCreateUserAsync(string discordId, string email, string username, string? avatarUrl);

    /// <summary>
    /// Updates user's last login timestamp
    /// </summary>
    Task UpdateLastLoginAsync(Guid userId);
}
