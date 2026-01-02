using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Safeturned.DiscordBot.Database;
using Safeturned.DiscordBot.Helpers;
using Serilog;

namespace Safeturned.DiscordBot.Services;

public class GuildConfigService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger _logger;
    private readonly IConfiguration _config;
    private readonly byte[]? _encryptionKey;

    public GuildConfigService(IConfiguration config, IServiceScopeFactory scopeFactory, ILogger logger)
    {
        _config = config;
        _encryptionKey = Convert.FromBase64String(config.GetRequiredString("GuildConfigEncryptionKey"));
        _scopeFactory = scopeFactory;
        _logger = logger.ForContext<GuildConfigService>();
    }

    public async Task<GuildConfiguration?> GetConfigAsync(ulong guildId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();
        return await db.GuildConfigurations.FindAsync(guildId);
    }

    public async Task SetApiKeyAsync(ulong guildId, string apiKey)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();

        var config = await db.GuildConfigurations.FindAsync(guildId);
        if (config == null)
        {
            config = new GuildConfiguration { GuildId = guildId };
            db.GuildConfigurations.Add(config);
        }

        config.EncryptedApiKey = ApiKeyEncryption.Encrypt(apiKey, _encryptionKey);
        config.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        _logger.Information("API key set for guild {GuildId}", guildId);
    }

    public async Task RemoveApiKeyAsync(ulong guildId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();

        var config = await db.GuildConfigurations.FindAsync(guildId);
        if (config != null)
        {
            config.EncryptedApiKey = null;
            config.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            _logger.Information("API key removed for guild {GuildId}", guildId);
        }
    }

    public async Task<string?> GetApiKeyAsync(ulong guildId)
    {
        var config = await GetConfigAsync(guildId);
        if (config?.EncryptedApiKey == null)
            return null;

        try
        {
            return ApiKeyEncryption.Decrypt(config.EncryptedApiKey, _encryptionKey);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to decrypt API key");
            SentrySdk.CaptureException(ex);
            return null;
        }
    }

    public bool IsOfficialGuild(ulong guildId)
    {
        return ulong.TryParse(_config.GetRequiredString("OfficialGuildId"), out var id) && id == guildId;
    }
}
