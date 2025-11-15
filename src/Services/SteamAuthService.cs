using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Services;

public class SteamAuthService : ISteamAuthService
{
    private readonly FilesDbContext _context;
    private readonly ILogger _logger;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public SteamAuthService(
        FilesDbContext context,
        ILogger logger,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _logger = logger.ForContext<SteamAuthService>();
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<User> HandleSteamCallbackAsync(string steamId, string username)
    {
        // Fetch real Steam profile data
        var (actualUsername, avatarUrl) = await FetchSteamProfileAsync(steamId);

        var user = await GetOrCreateUserAsync(steamId, actualUsername ?? username, avatarUrl);
        await UpdateLastLoginAsync(user.Id);
        return user;
    }

    private async Task<(string? username, string? avatarUrl)> FetchSteamProfileAsync(string steamId)
    {
        try
        {
            var apiKey = _config.GetValue<string>("Steam:ApiKey");
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.Warning("Steam API key not configured, cannot fetch profile data");
                return (null, null);
            }

            // Extract the numeric Steam ID from the OpenID URL if needed
            var numericSteamId = steamId;
            if (steamId.Contains("/"))
            {
                // Extract from URL like "https://steamcommunity.com/openid/id/76561199589103064"
                numericSteamId = steamId.Split('/').Last();
            }

            var url = $"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={apiKey}&steamids={numericSteamId}";

            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.Warning("Steam API request failed with status {StatusCode}", response.StatusCode);
                return (null, null);
            }

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("response", out var responseElement) &&
                responseElement.TryGetProperty("players", out var playersElement) &&
                playersElement.GetArrayLength() > 0)
            {
                var player = playersElement[0];
                var personaName = player.TryGetProperty("personaname", out var nameElement)
                    ? nameElement.GetString()
                    : null;
                var avatarFull = player.TryGetProperty("avatarfull", out var avatarElement)
                    ? avatarElement.GetString()
                    : null;

                _logger.Information("Fetched Steam profile for {SteamId}: {Username}", numericSteamId, personaName);
                return (personaName, avatarFull);
            }

            _logger.Warning("Steam API returned no player data for {SteamId}", numericSteamId);
            return (null, null);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error fetching Steam profile for {SteamId}", steamId);
            return (null, null);
        }
    }

    public async Task<User> GetOrCreateUserAsync(string steamId, string username, string? avatarUrl)
    {
        // Extract numeric Steam ID if it's a URL
        var numericSteamId = steamId.Contains("/") ? steamId.Split('/').Last() : steamId;

        // Check if this Steam identity already exists
        var existingIdentity = await _context.Set<UserIdentity>()
            .Include(ui => ui.User)
            .FirstOrDefaultAsync(ui => ui.Provider == AuthProvider.Steam && ui.ProviderUserId == numericSteamId);

        if (existingIdentity != null)
        {
            // Update the Steam identity with latest info
            existingIdentity.ProviderUsername = username;
            existingIdentity.AvatarUrl = avatarUrl;
            existingIdentity.LastAuthenticatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.Information("Updated existing Steam identity for user {UserId}", existingIdentity.UserId);
            return existingIdentity.User;
        }

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = null, // Steam doesn't provide email, so we leave it empty
            Tier = TierType.Free,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            IsAdmin = false
        };

        _context.Set<User>().Add(newUser);
        await _context.SaveChangesAsync();
        _logger.Information("Created new user {UserId} from Steam", newUser.Id);

        var steamIdentity = new UserIdentity
        {
            Id = Guid.NewGuid(),
            UserId = newUser.Id,
            Provider = AuthProvider.Steam,
            ProviderUserId = numericSteamId,
            ProviderUsername = username,
            AvatarUrl = avatarUrl,
            ConnectedAt = DateTime.UtcNow,
            LastAuthenticatedAt = DateTime.UtcNow
        };

        _context.Set<UserIdentity>().Add(steamIdentity);
        await _context.SaveChangesAsync();

        _logger.Information("Created Steam identity for user {UserId}", newUser.Id);
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
