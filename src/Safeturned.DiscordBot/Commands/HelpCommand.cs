using Discord;
using Discord.Interactions;
using Safeturned.DiscordBot.Services;

namespace Safeturned.DiscordBot.Commands;

public class HelpCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GuildConfigService _guildConfig;

    public HelpCommand(GuildConfigService guildConfig)
    {
        _guildConfig = guildConfig;
    }

    [SlashCommand("help", "Get help with Safeturned bot commands")]
    public async Task ShowHelpAsync()
    {
        var isOfficial = _guildConfig.IsOfficialGuild(Context.Guild.Id);
        var hasApiKey = !string.IsNullOrEmpty(await _guildConfig.GetApiKeyAsync(Context.Guild.Id));

        var embed = new EmbedBuilder()
            .WithTitle("🛡️ Safeturned Bot Help")
            .WithDescription(
                "Safeturned helps you scan Unturned plugin files (.dll) for security threats.\n\n" +
                "**Available Commands:**")
            .WithColor(new Color(139, 92, 246))
            .AddField(
                "`/analyze`",
                "Upload a `.dll` file to scan it for malware, backdoors, and security vulnerabilities.\n" +
                "*Attach a file when running this command.*",
                inline: false)
            .AddField(
                "`/private`",
                "Create a temporary private channel for confidential file analysis.\n" +
                "*Channel auto-deletes after 10 minutes.*",
                inline: false)
            .AddField(
                "`/usage`",
                "Check your current API usage and rate limits.",
                inline: false)
            .AddField(
                "`/setup` *(Admin only)*",
                "Configure your Safeturned API key for this server.\n" +
                "*Required for non-official servers.*",
                inline: false)
            .AddField(
                "`/help`",
                "Show this help message.",
                inline: false)
            .WithFooter("Safeturned Plugin Security Scanner • safeturned.com");

        if (isOfficial)
        {
            embed.AddField(
                "📍 Server Status",
                "✅ **Official Safeturned Server**\nAll commands are available with high-tier API access.",
                inline: false);
        }
        else if (hasApiKey)
        {
            embed.AddField(
                "📍 Server Status",
                "✅ **API Key Configured**\nAll commands are available.",
                inline: false);
        }
        else
        {
            embed.AddField(
                "📍 Server Status",
                "⚠️ **API Key Not Configured**\nA server admin needs to run `/setup` to enable commands.\n" +
                "Get your API key at [safeturned.com/dashboard](https://safeturned.com/dashboard)",
                inline: false);
        }

        var components = new ComponentBuilder()
            .WithButton("Website", style: ButtonStyle.Link, url: "https://safeturned.com")
            .WithButton("Dashboard", style: ButtonStyle.Link, url: "https://safeturned.com/dashboard")
            .WithButton("Support", style: ButtonStyle.Link, url: "https://discord.gg/safeturned")
            .Build();

        await RespondAsync(embed: embed.Build(), components: components, ephemeral: true);
    }
}
