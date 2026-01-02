using Discord;
using Discord.Interactions;
using Microsoft.Extensions.Configuration;
using Safeturned.DiscordBot.Services;
using Serilog;

namespace Safeturned.DiscordBot.Commands;

public class UsageCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly SafeturnedApiClient _apiClient;
    private readonly GuildConfigService _guildConfig;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;

    public UsageCommand(SafeturnedApiClient apiClient, GuildConfigService guildConfig, IConfiguration configuration, ILogger logger)
    {
        _apiClient = apiClient;
        _guildConfig = guildConfig;
        _configuration = configuration;
        _logger = logger.ForContext<UsageCommand>();
    }

    [SlashCommand("usage", "Check your API usage and rate limits")]
    public async Task CheckUsageAsync()
    {
        await DeferAsync(ephemeral: true);

        try
        {
            string? apiKey;
            var isOfficial = _guildConfig.IsOfficialGuild(Context.Guild.Id);

            if (isOfficial)
            {
                apiKey = _configuration["SafeturnedBotApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                {
                    await FollowupAsync(
                        embed: CreateErrorEmbed("Configuration Error", "Bot API key is not configured."),
                        ephemeral: true);
                    return;
                }
            }
            else
            {
                apiKey = await _guildConfig.GetApiKeyAsync(Context.Guild.Id);
                if (string.IsNullOrEmpty(apiKey))
                {
                    await FollowupAsync(
                        embed: CreateInfoEmbed(
                            "No API Key",
                            "This server doesn't have an API key configured.\n\n" +
                            "A server administrator needs to run `/setup` to configure an API key."),
                        ephemeral: true);
                    return;
                }
            }

            var usage = await _apiClient.GetUsageAsync(apiKey);

            if (usage == null)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed("Error", "Failed to retrieve usage information."),
                    ephemeral: true);
                return;
            }

            var usagePercent = usage.RequestsLimit > 0
                ? (double)usage.RequestsUsed / usage.RequestsLimit * 100
                : 0;

            var progressBar = CreateProgressBar(usagePercent);
            var timeUntilReset = usage.ResetAt - DateTime.UtcNow;
            var resetText = timeUntilReset.TotalMinutes > 0
                ? $"{timeUntilReset.Hours}h {timeUntilReset.Minutes}m"
                : "Soon";

            var embed = new EmbedBuilder()
                .WithTitle("📊 API Usage")
                .WithColor(GetUsageColor(usagePercent))
                .AddField("Tier", GetTierDisplay(usage.Tier), inline: true)
                .AddField("Resets In", resetText, inline: true)
                .AddField("\u200B", "\u200B", inline: true) // Spacer
                .AddField(
                    "Requests",
                    $"```\n{progressBar}\n{usage.RequestsUsed:N0} / {usage.RequestsLimit:N0} ({usagePercent:F1}%)\n```")
                .WithFooter("Safeturned Plugin Security Scanner")
                .WithTimestamp(DateTimeOffset.UtcNow);

            if (isOfficial)
            {
                embed.WithDescription("🏠 **Official Server** - Using bot's high-tier API access");
            }

            if (usagePercent >= 90)
            {
                embed.AddField(
                    "⚠️ High Usage Warning",
                    "You're close to your rate limit. Consider upgrading at [safeturned.com/pricing](https://safeturned.com/pricing)");
            }

            await FollowupAsync(embed: embed.Build(), ephemeral: true);
        }
        catch (SafeturnedApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            await FollowupAsync(
                embed: CreateErrorEmbed(
                    "Invalid API Key",
                    "The configured API key is invalid or expired.\n\n" +
                    "A server administrator needs to run `/setup` with a valid API key."),
                ephemeral: true);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to check usage in guild {GuildId}", Context.Guild.Id);
            SentrySdk.CaptureException(ex);
            await FollowupAsync(
                embed: CreateErrorEmbed("Error", "Failed to retrieve usage information. Please try again later."),
                ephemeral: true);
        }
    }

    private static string CreateProgressBar(double percent)
    {
        const int barLength = 20;
        var filled = Math.Min((int)(percent / 100 * barLength), barLength);
        var empty = barLength - filled;

        return $"[{new string('█', filled)}{new string('░', empty)}]";
    }

    private static Color GetUsageColor(double percent)
    {
        return percent switch
        {
            >= 90 => new Color(255, 71, 87),   // Red
            >= 70 => new Color(255, 165, 2),   // Orange
            >= 50 => new Color(255, 217, 61),  // Yellow
            _ => new Color(46, 213, 115)       // Green
        };
    }

    private static string GetTierDisplay(string tier)
    {
        return tier.ToLowerInvariant() switch
        {
            "free" => "🆓 Free",
            "basic" => "⭐ Basic",
            "pro" => "💎 Pro",
            "enterprise" => "🏢 Enterprise",
            "bot" => "🤖 Bot",
            _ => tier
        };
    }

    private static Embed CreateErrorEmbed(string title, string description)
    {
        return new EmbedBuilder()
            .WithTitle($"❌ {title}")
            .WithDescription(description)
            .WithColor(Color.Red)
            .Build();
    }

    private static Embed CreateInfoEmbed(string title, string description)
    {
        return new EmbedBuilder()
            .WithTitle($"ℹ️ {title}")
            .WithDescription(description)
            .WithColor(new Color(139, 92, 246))
            .Build();
    }
}
