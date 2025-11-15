using Safeturned.Api.Controllers;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public interface ITokenService
{
    /// <summary>
    /// Generates a JWT access token for the user
    /// </summary>
    string GenerateAccessToken(User user);

    /// <summary>
    /// Generates a refresh token for the user
    /// </summary>
    Task<RefreshToken> GenerateRefreshTokenAsync(User user, string ipAddress);

    /// <summary>
    /// Validates a refresh token and returns the user if valid
    /// </summary>
    Task<User?> ValidateRefreshTokenAsync(string token);

    /// <summary>
    /// Revokes a refresh token
    /// </summary>
    Task RevokeRefreshTokenAsync(string token);

    /// <summary>
    /// Validates a JWT token and extracts the user ID
    /// </summary>
    Guid? ValidateAccessToken(string token);

    /// <summary>
    /// Gets all linked identities for a user
    /// </summary>
    Task<List<LinkedIdentityResponse>> GetUserIdentitiesAsync(Guid userId);

    /// <summary>
    /// Unlinks an OAuth identity from a user
    /// </summary>
    Task<bool> UnlinkIdentityAsync(Guid userId, string providerName);
}
