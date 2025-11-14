using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Services;

public class TokenService : ITokenService
{
    private readonly FilesDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger _logger;

    public TokenService(FilesDbContext context, IConfiguration config, ILogger logger)
    {
        _context = context;
        _config = config;
        _logger = logger.ForContext<TokenService>();
    }

    public string GenerateAccessToken(User user)
    {
        var jwtSecret = _config.GetRequiredString("Jwt:SecretKey");
        var jwtIssuer = _config.GetRequiredString("Jwt:Issuer");
        var jwtAudience = _config.GetRequiredString("Jwt:Audience");
        var expirationMinutes = int.Parse(_config.GetRequiredString("Jwt:ExpirationMinutes"));

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("tier", ((int)user.Tier).ToString()),
            new Claim("is_admin", user.IsAdmin.ToString().ToLowerInvariant())
        };

        if (!string.IsNullOrEmpty(user.Username))
            claims.Add(new Claim("username", user.Username));
        if (!string.IsNullOrEmpty(user.AvatarUrl))
            claims.Add(new Claim("avatar_url", user.AvatarUrl));

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

        _context.Set<RefreshToken>().Add(refreshToken);
        await _context.SaveChangesAsync();

        _logger.Information("Generated refresh token for user {UserId}", user.Id);

        return refreshToken;
    }

    public async Task<User?> ValidateRefreshTokenAsync(string token)
    {
        var refreshToken = await _context.Set<RefreshToken>()
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
        var refreshToken = await _context.Set<RefreshToken>()
            .FirstOrDefaultAsync(rt => rt.Token == token);

        if (refreshToken != null)
        {
            refreshToken.IsRevoked = true;
            refreshToken.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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
            return null;
        }
    }

    private static string GenerateSecureRandomToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}