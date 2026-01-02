using Discord;
using Discord.Interactions;
using Safeturned.DiscordBot.Services;
using Serilog;

namespace Safeturned.DiscordBot.Commands;

[DefaultMemberPermissions(GuildPermission.Administrator)]
public class SetupCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly SafeturnedApiClient _apiClient;
    private readonly GuildConfigService _guildConfig;
    private readonly ILogger _logger;

    public SetupCommand(SafeturnedApiClient apiClient, GuildConfigService guildConfig, ILogger logger)
    {
        _apiClient = apiClient;
        _guildConfig = guildConfig;
        _logger = logger.ForContext<SetupCommand>();
    }

    [SlashCommand("setup", "Configure your Safeturned API key for this server")]
    public async Task SetupAsync(
        [Summary("api_key", "Your Safeturned API key from the dashboard")] string? apiKey = null)
    {
        await DeferAsync(ephemeral: true);

        // Check if this is the official guild
        if (_guildConfig.IsOfficialGuild(Context.Guild.Id))
        {
            await FollowupAsync(
                embed: CreateInfoEmbed(
                    "Official Server",
                    "This is the official Safeturned server. No API key configuration is needed.\n\n" +
                    "All members can use `/analyze` with the bot's built-in high-tier access!"),
                ephemeral: true);
            return;
        }

        // If no API key provided, show current status
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            var currentKey = await _guildConfig.GetApiKeyAsync(Context.Guild.Id);
            if (string.IsNullOrEmpty(currentKey))
            {
                await FollowupAsync(
                    embed: CreateInfoEmbed(
                        "API Key Not Configured",
                        "This server doesn't have an API key configured.\n\n" +
                        "**To set up:**\n" +
                        "1. Get your API key at [safeturned.com/dashboard](https://safeturned.com/dashboard)\n" +
                        "2. Run `/setup api_key:YOUR_KEY_HERE`\n\n" +
                        "⚠️ Keep your API key secret - use this command in a private channel!"),
                    ephemeral: true);
            }
            else
            {
                var maskedKey = currentKey.Length >= 12
                    ? $"{currentKey[..8]}...{currentKey[^4..]}"
                    : new string('*', currentKey.Length);
                await FollowupAsync(
                    embed: CreateSuccessEmbed(
                        "API Key Configured",
                        $"This server has an API key configured: `{maskedKey}`\n\n" +
                        "**Options:**\n" +
                        "• Run `/setup api_key:NEW_KEY` to update\n" +
                        "• Run `/setup-remove` to remove the key\n" +
                        "• Run `/usage` to check your rate limits"),
                    ephemeral: true);
            }
            return;
        }

        // Validate the API key
        try
        {
            var isValid = await _apiClient.ValidateApiKeyAsync(apiKey);
            if (!isValid)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed(
                        "Invalid API Key",
                        "The provided API key is invalid.\n\n" +
                        "Make sure you copied it correctly from [safeturned.com/dashboard](https://safeturned.com/dashboard)"),
                    ephemeral: true);
                return;
            }

            // Save the API key
            await _guildConfig.SetApiKeyAsync(Context.Guild.Id, apiKey);

            await FollowupAsync(
                embed: CreateSuccessEmbed(
                    "API Key Saved",
                    "Your API key has been configured successfully! ✅\n\n" +
                    "Server members can now use `/analyze` to scan plugin files.\n\n" +
                    "Use `/usage` to monitor your rate limits."),
                ephemeral: true);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to validate API key in guild {GuildId}", Context.Guild.Id);
            SentrySdk.CaptureException(ex);
            await FollowupAsync(
                embed: CreateErrorEmbed("Validation Failed", "Failed to validate API key. Please try again later."),
                ephemeral: true);
        }
    }

    [SlashCommand("setup-remove", "Remove the configured API key from this server")]
    public async Task RemoveAsync()
    {
        await DeferAsync(ephemeral: true);

        if (_guildConfig.IsOfficialGuild(Context.Guild.Id))
        {
            await FollowupAsync(
                embed: CreateInfoEmbed("Official Server", "This is the official Safeturned server. No configuration needed."),
                ephemeral: true);
            return;
        }

        var currentKey = await _guildConfig.GetApiKeyAsync(Context.Guild.Id);
        if (string.IsNullOrEmpty(currentKey))
        {
            await FollowupAsync(
                embed: CreateInfoEmbed("No API Key", "This server doesn't have an API key configured."),
                ephemeral: true);
            return;
        }

        await _guildConfig.RemoveApiKeyAsync(Context.Guild.Id);

        await FollowupAsync(
            embed: CreateSuccessEmbed(
                "API Key Removed",
                "The API key has been removed from this server.\n\n" +
                "Members will no longer be able to use `/analyze` until a new key is configured."),
            ephemeral: true);
    }

    private static Embed CreateSuccessEmbed(string title, string description)
    {
        return new EmbedBuilder()
            .WithTitle($"✅ {title}")
            .WithDescription(description)
            .WithColor(new Color(46, 213, 115))
            .Build();
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
