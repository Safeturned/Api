using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface ISteamAuthService
{
    Task<User> HandleSteamCallbackAsync(string steamId, string username);
    Task<User> GetOrCreateUserAsync(string steamId, string username, string? avatarUrl);
    Task UpdateLastLoginAsync(Guid userId);
}
