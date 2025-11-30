using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Safeturned.Api.Constants;
using Safeturned.Api.Controllers;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;
using Sentry;

namespace Safeturned.Api.Services;

public class TokenService : ITokenService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger _logger;

    public TokenService(IServiceScopeFactory serviceScopeFactory, IConfiguration config, ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _config = config;
        _logger = logger.ForContext<TokenService>();
    }

    public string GenerateAccessToken(User user)
    {
        var jwtSecret = _config.GetRequiredString("Jwt:SecretKey");
        var jwtIssuer = _config.GetRequiredString("Jwt:Issuer");
        var jwtAudience = _config.GetRequiredString("Jwt:Audience");
        var expirationMinutes = _config.GetValue<int?>("Jwt:ExpirationMinutes") ?? 60;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(AuthConstants.TierClaim, ((int)user.Tier).ToString()),
            new Claim(AuthConstants.IsAdminClaim, user.IsAdmin.ToString().ToLowerInvariant())
        };

        // Email is optional (Steam users don't have email)
        if (!string.IsNullOrEmpty(user.Email))
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));

        if (!string.IsNullOrEmpty(user.Username))
            claims.Add(new Claim(AuthConstants.UsernameClaim, user.Username));
        if (!string.IsNullOrEmpty(user.AvatarUrl))
            claims.Add(new Claim(AuthConstants.AvatarUrlClaim, user.AvatarUrl));

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<RefreshToken> GenerateRefreshTokenAsync(User user, string ipAddress)
    {
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureRandomToken(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7), // Refresh tokens valid for 7 days
            CreatedByIp = ipAddress
        };

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        db.Set<RefreshToken>().Add(refreshToken);
        await db.SaveChangesAsync();

        _logger.Information("Generated refresh token for user {UserId}", user.Id);

        return refreshToken;
    }

    public async Task<User?> ValidateRefreshTokenAsync(string token)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var refreshToken = await db.Set<RefreshToken>()
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);

        if (refreshToken == null)
        {
            _logger.Warning("Invalid or expired refresh token attempted");
            return null;
        }

        return refreshToken.User;
    }

    public async Task RevokeRefreshTokenAsync(string token)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var refreshToken = await db.Set<RefreshToken>()
            .FirstOrDefaultAsync(rt => rt.Token == token);

        if (refreshToken != null)
        {
            refreshToken.IsRevoked = true;
            refreshToken.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            _logger.Information("Revoked refresh token for user {UserId}", refreshToken.UserId);
        }
    }

    public Guid? ValidateAccessToken(string token)
    {
        try
        {
            var jwtSecret = _config.GetRequiredString("Jwt:SecretKey");
            var jwtIssuer = _config.GetRequiredString("Jwt:Issuer");
            var jwtAudience = _config.GetRequiredString("Jwt:Audience");

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(jwtSecret);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            var userIdClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub);

            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Failed to validate access token");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to validate access token"));
            return null;
        }
    }

    public async Task<List<LinkedIdentityResponse>> GetUserIdentitiesAsync(Guid userId)
    {
        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var identities = await db.Set<UserIdentity>()
            .Where(ui => ui.UserId == userId)
            .OrderByDescending(ui => ui.LastAuthenticatedAt ?? ui.ConnectedAt)
            .ToListAsync();

        return identities
            .Select(i => new LinkedIdentityResponse(
                i.Provider.ToString(),
                (int)i.Provider,
                i.ProviderUserId,
                i.ProviderUsername,
                i.ConnectedAt,
                i.LastAuthenticatedAt
            ))
            .ToList();
    }

    public async Task<bool> UnlinkIdentityAsync(Guid userId, string providerName)
    {
        if (!Enum.TryParse<AuthProvider>(providerName, true, out var provider))
        {
            _logger.Warning("Invalid provider name: {Provider}", providerName);
            return false;
        }

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var identity = await db.Set<UserIdentity>()
            .FirstOrDefaultAsync(ui => ui.UserId == userId && ui.Provider == provider);

        if (identity == null)
        {
            _logger.Warning("Attempted to unlink non-existent {Provider} identity for user {UserId}", providerName, userId);
            return false;
        }

        db.Set<UserIdentity>().Remove(identity);
        await db.SaveChangesAsync();

        _logger.Information("Unlinked {Provider} identity for user {UserId}", providerName, userId);
        return true;
    }

    private static string GenerateSecureRandomToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}

public record LinkedIdentityResponse(
    string ProviderName,
    int ProviderId,
    string ProviderUserId,
    string? ProviderUsername,
    DateTime ConnectedAt,
    DateTime? LastAuthenticatedAt
);