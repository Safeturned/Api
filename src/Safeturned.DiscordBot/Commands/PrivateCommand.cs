using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using Safeturned.DiscordBot.Services;

namespace Safeturned.DiscordBot.Commands;

public class PrivateCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GuildConfigService _guildConfig;
    private readonly ChannelCleanupService _channelCleanup;
    private const int ChannelLifetimeMinutes = 10;
    private static readonly Dictionary<ulong, DateTime> _userCooldowns = new();
    private static readonly object _cooldownLock = new();
    private static readonly TimeSpan CooldownDuration = TimeSpan.FromMinutes(5);

    public PrivateCommand(GuildConfigService guildConfig, ChannelCleanupService channelCleanup)
    {
        _guildConfig = guildConfig;
        _channelCleanup = channelCleanup;
    }

    [SlashCommand("private", "Create a temporary private channel for private file analysis")]
    public async Task CreatePrivateChannelAsync()
    {
        await DeferAsync(ephemeral: true);

        try
        {
            var guild = Context.Guild;
            var user = Context.User as SocketGuildUser;

            if (user == null)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed("Error", "Could not identify the user."),
                    ephemeral: true);
                return;
            }

            lock (_cooldownLock)
            {
                if (_userCooldowns.TryGetValue(user.Id, out var lastUsed))
                {
                    var cooldownEnds = lastUsed.Add(CooldownDuration);
                    if (cooldownEnds > DateTime.UtcNow)
                    {
                        var cooldownTimestamp = new DateTimeOffset(cooldownEnds).ToUnixTimeSeconds();
                        FollowupAsync(
                            embed: CreateErrorEmbed(
                                "Cooldown Active",
                                $"You can create another private channel <t:{cooldownTimestamp}:R>."),
                            ephemeral: true).Wait();
                        return;
                    }
                }
                _userCooldowns[user.Id] = DateTime.UtcNow;
            }

            if (!_guildConfig.IsOfficialGuild(guild.Id))
            {
                var apiKey = await _guildConfig.GetApiKeyAsync(guild.Id);
                if (string.IsNullOrEmpty(apiKey))
                {
                    await FollowupAsync(
                        embed: CreateErrorEmbed(
                            "API Key Required",
                            "This server needs an API key configured before using private channels.\n\n" +
                            "A server administrator needs to run `/setup` first."),
                        ephemeral: true);
                    return;
                }
            }

            // Create permission overwrites
            var permissions = new List<Overwrite>
            {
                // Deny everyone
                new(guild.EveryoneRole.Id, PermissionTarget.Role, new OverwritePermissions(viewChannel: PermValue.Deny)),
                // Allow the user
                new(user.Id, PermissionTarget.User, new OverwritePermissions(
                    viewChannel: PermValue.Allow,
                    sendMessages: PermValue.Allow,
                    attachFiles: PermValue.Allow,
                    readMessageHistory: PermValue.Allow)),
                // Allow the bot
                new(Context.Client.CurrentUser.Id, PermissionTarget.User, new OverwritePermissions(
                    viewChannel: PermValue.Allow,
                    sendMessages: PermValue.Allow,
                    manageChannel: PermValue.Allow,
                    embedLinks: PermValue.Allow))
            };

            // Create the channel with sanitized username
            var sanitizedUsername = new string(user.Username
                .ToLowerInvariant()
                .Where(c => char.IsLetterOrDigit(c) || c == '-')
                .Take(20)
                .ToArray());
            if (string.IsNullOrEmpty(sanitizedUsername)) sanitizedUsername = "user";
            var channelName = $"private-scan-{sanitizedUsername}-{DateTime.UtcNow:HHmmss}";
            var channel = await guild.CreateTextChannelAsync(channelName, props =>
            {
                props.PermissionOverwrites = permissions;
                props.Topic = $"Private analysis channel for {user.Username}. Auto-deletes in {ChannelLifetimeMinutes} minutes.";
            });

            // Schedule channel deletion (persisted to database)
            var deleteAt = DateTime.UtcNow.AddMinutes(ChannelLifetimeMinutes);
            await _channelCleanup.ScheduleDeletionAsync(guild.Id, channel.Id, user.Id, deleteAt);

            // Discord timestamp format: <t:UNIX_TIMESTAMP:R> shows relative time with live countdown
            var deleteTimestamp = new DateTimeOffset(deleteAt).ToUnixTimeSeconds();

            // Send welcome message in the private channel
            var welcomeEmbed = new EmbedBuilder()
                .WithTitle("🔒 Private Analysis Channel")
                .WithDescription(
                    $"Welcome {user.Mention}! This is your private analysis channel.\n\n" +
                    $"**How to use:**\n" +
                    $"• Upload a `.dll` file and use `/analyze` to scan it\n" +
                    $"• Only you and the bot can see this channel\n\n" +
                    $"⏰ **This channel will be automatically deleted <t:{deleteTimestamp}:R>.**")
                .WithColor(new Color(139, 92, 246))
                .WithFooter("Safeturned Plugin Security Scanner")
                .Build();

            await channel.SendMessageAsync(embed: welcomeEmbed);

            // Respond to the user
            await FollowupAsync(
                embed: CreateSuccessEmbed(
                    "Private Channel Created",
                    $"Your private channel has been created: {channel.Mention}\n\n" +
                    $"⏰ The channel will be automatically deleted <t:{deleteTimestamp}:R>."),
                ephemeral: true);
        }
        catch (Discord.Net.HttpException ex) when (ex.DiscordCode == DiscordErrorCode.MissingPermissions)
        {
            await FollowupAsync(
                embed: CreateErrorEmbed(
                    "Missing Permissions",
                    "The bot doesn't have permission to create channels.\n\n" +
                    "Please ensure the bot has the **Manage Channels** permission."),
                ephemeral: true);
        }
        catch (Exception ex)
        {
            SentrySdk.CaptureException(ex);
            await FollowupAsync(
                embed: CreateErrorEmbed("Error", $"Failed to create private channel: {ex.Message}"),
                ephemeral: true);
        }
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
}
