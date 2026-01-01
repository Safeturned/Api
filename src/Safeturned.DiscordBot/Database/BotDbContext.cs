using Microsoft.EntityFrameworkCore;

namespace Safeturned.DiscordBot.Database;

public class BotDbContext : DbContext
{
    public BotDbContext(DbContextOptions<BotDbContext> options) : base(options)
    {
    }

    public DbSet<ScheduledChannelDeletion> ScheduledChannelDeletions => Set<ScheduledChannelDeletion>();
    public DbSet<GuildConfiguration> GuildConfigurations => Set<GuildConfiguration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ScheduledChannelDeletion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DeleteAt);
            entity.HasIndex(e => e.ChannelId).IsUnique();
        });

        modelBuilder.Entity<GuildConfiguration>(entity =>
        {
            entity.HasKey(e => e.GuildId);
        });
    }
}

public class ScheduledChannelDeletion
{
    public int Id { get; set; }
    public ulong GuildId { get; set; }
    public ulong ChannelId { get; set; }
    public ulong CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime DeleteAt { get; set; }
}

public class GuildConfiguration
{
    public ulong GuildId { get; set; }
    public string? EncryptedApiKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
