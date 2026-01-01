using Discord.WebSocket;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Safeturned.DiscordBot.Database;
using Serilog;

namespace Safeturned.DiscordBot.Services;

public class ChannelCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly DiscordSocketClient _client;
    private readonly ILogger _logger;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(30);

    public ChannelCleanupService(
        IServiceScopeFactory scopeFactory,
        DiscordSocketClient client,
        ILogger logger)
    {
        _scopeFactory = scopeFactory;
        _client = client;
        _logger = logger.ForContext<ChannelCleanupService>();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (_client.ConnectionState != Discord.ConnectionState.Connected && !stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }

        _logger.Information("Channel cleanup service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredChannelsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error during channel cleanup");
                SentrySdk.CaptureException(ex);
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task CleanupExpiredChannelsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();

        var expiredDeletions = await db.ScheduledChannelDeletions
            .Where(d => d.DeleteAt <= DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var deletion in expiredDeletions)
        {
            try
            {
                var guild = _client.GetGuild(deletion.GuildId);
                var channel = guild?.GetChannel(deletion.ChannelId);

                if (channel != null)
                {
                    await channel.DeleteAsync();
                    _logger.Information(
                        "Deleted scheduled channel {ChannelId} in guild {GuildId}",
                        deletion.ChannelId, deletion.GuildId);
                }

                db.ScheduledChannelDeletions.Remove(deletion);
            }
            catch (Discord.Net.HttpException ex) when (ex.DiscordCode == Discord.DiscordErrorCode.UnknownChannel)
            {
                db.ScheduledChannelDeletions.Remove(deletion);
                _logger.Debug("Channel {ChannelId} was already deleted", deletion.ChannelId);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to delete channel {ChannelId}", deletion.ChannelId);
                SentrySdk.CaptureException(ex);
            }
        }

        if (expiredDeletions.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task ScheduleDeletionAsync(ulong guildId, ulong channelId, ulong userId, DateTime deleteAt)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();

        var existing = await db.ScheduledChannelDeletions
            .FirstOrDefaultAsync(d => d.ChannelId == channelId);

        if (existing != null)
        {
            existing.DeleteAt = deleteAt;
        }
        else
        {
            db.ScheduledChannelDeletions.Add(new ScheduledChannelDeletion
            {
                GuildId = guildId,
                ChannelId = channelId,
                CreatedByUserId = userId,
                DeleteAt = deleteAt
            });
        }

        await db.SaveChangesAsync();
        _logger.Information(
            "Scheduled channel {ChannelId} for deletion at {DeleteAt}",
            channelId, deleteAt);
    }

    public async Task CancelDeletionAsync(ulong channelId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BotDbContext>();

        var deletion = await db.ScheduledChannelDeletions
            .FirstOrDefaultAsync(d => d.ChannelId == channelId);

        if (deletion != null)
        {
            db.ScheduledChannelDeletions.Remove(deletion);
            await db.SaveChangesAsync();
            _logger.Information("Cancelled scheduled deletion for channel {ChannelId}", channelId);
        }
    }
}
