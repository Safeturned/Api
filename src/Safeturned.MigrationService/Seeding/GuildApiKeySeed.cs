using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Safeturned.DiscordBot.Database;
using Safeturned.DiscordBot.Helpers;

namespace Safeturned.MigrationService.Seeding;

public class GuildApiKeySeed
{
    private readonly BotDbContext _context;
    private readonly ILogger<GuildApiKeySeed> _logger;
    private readonly IHostEnvironment _environment;
    private readonly IConfiguration _config;

    public GuildApiKeySeed(
        BotDbContext context,
        ILogger<GuildApiKeySeed> logger,
        IHostEnvironment environment,
        IConfiguration config)
    {
        _context = context;
        _logger = logger;
        _environment = environment;
        _config = config;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!_environment.IsDevelopment())
        {
            _logger.LogInformation("Skipping guild API key seed in non-development environment");
            return;
        }

        try
        {
            var guildIdStr = _config["GuildApiKeySeed:GuildId"];
            var apiKey = _config["GuildApiKeySeed:ApiKey"];
            var encryptionKeyBase64 = _config["GuildApiKeySeed:EncryptionKey"];

            if (string.IsNullOrEmpty(guildIdStr) || string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("GuildApiKeySeed configuration is missing, skipping seed");
                return;
            }
            if (!ulong.TryParse(guildIdStr, out var guildId))
            {
                _logger.LogWarning("Invalid GuildId in configuration: {GuildId}", guildIdStr);
                return;
            }
            var existingConfig = await _context.GuildConfigurations.FirstOrDefaultAsync(x => x.GuildId == guildId, cancellationToken);
            if (existingConfig?.EncryptedApiKey != null)
            {
                _logger.LogInformation("Guild {GuildId} already has an API key configured, skipping seed", guildId);
                return;
            }

            byte[]? encryptionKey = string.IsNullOrEmpty(encryptionKeyBase64)
                ? null
                : Convert.FromBase64String(encryptionKeyBase64);
            var encryptedKey = ApiKeyEncryption.Encrypt(apiKey, encryptionKey);

            if (existingConfig == null)
            {
                existingConfig = new GuildConfiguration
                {
                    GuildId = guildId,
                    EncryptedApiKey = encryptedKey,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.GuildConfigurations.Add(existingConfig);
            }
            else
            {
                existingConfig.EncryptedApiKey = encryptedKey;
                existingConfig.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded API key for guild {GuildId}", guildId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed guild API key");
        }
    }
}
