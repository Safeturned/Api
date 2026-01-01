using System.Security.Cryptography;
using System.Text;
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
    private readonly IConfiguration _configuration;
    private readonly byte[]? _encryptionKey;

    public GuildConfigService(IConfiguration configuration, IServiceScopeFactory scopeFactory, ILogger logger)
    {
        _configuration = configuration;
        _encryptionKey = Convert.FromBase64String(configuration.GetRequiredString("GuildConfigEncryptionKey"));
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

        config.EncryptedApiKey = EncryptApiKey(apiKey);
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
        return config?.EncryptedApiKey != null ? DecryptApiKey(config.EncryptedApiKey) : null;
    }

    public bool IsOfficialGuild(ulong guildId)
    {
        var officialGuildId = _configuration["OfficialGuildId"];
        return !string.IsNullOrEmpty(officialGuildId)
            && ulong.TryParse(officialGuildId, out var id)
            && id == guildId;
    }

    private string EncryptApiKey(string apiKey)
    {
        if (_encryptionKey == null)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(apiKey));
        }

        using var aes = Aes.Create();
        aes.Key = _encryptionKey;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(apiKey);
        var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var result = new byte[aes.IV.Length + encryptedBytes.Length];
        aes.IV.CopyTo(result, 0);
        encryptedBytes.CopyTo(result, aes.IV.Length);

        return Convert.ToBase64String(result);
    }

    private string? DecryptApiKey(string encryptedApiKey)
    {
        try
        {
            var data = Convert.FromBase64String(encryptedApiKey);

            if (_encryptionKey == null)
            {
                return Encoding.UTF8.GetString(data);
            }

            using var aes = Aes.Create();
            aes.Key = _encryptionKey;

            var iv = new byte[16];
            var cipherText = new byte[data.Length - 16];
            Array.Copy(data, 0, iv, 0, 16);
            Array.Copy(data, 16, cipherText, 0, cipherText.Length);

            aes.IV = iv;
            using var decryptor = aes.CreateDecryptor();
            var decryptedBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);

            return Encoding.UTF8.GetString(decryptedBytes);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to decrypt API key");
            SentrySdk.CaptureException(ex);
            return null;
        }
    }
}
