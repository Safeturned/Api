using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Database;

public class FilesDbContext : DbContext
{
#pragma warning disable CS8618
    public FilesDbContext(DbContextOptions<FilesDbContext> options) : base(options)
#pragma warning restore CS8618
    {
    }

    // ReSharper disable UnusedMember.Local (Used externally by Set<T>())
    public DbSet<FileData> Files { get; set; }
    private DbSet<ScanRecord> Scans { get; set; }
    private DbSet<ChunkUploadSession> ChunkUploadSessions { get; set; }
    private DbSet<User> Users { get; set; }
    private DbSet<UserIdentity> UserIdentities { get; set; }
    private DbSet<ApiKey> ApiKeys { get; set; }
    private DbSet<ApiKeyUsage> ApiKeyUsages { get; set; }
    private DbSet<Models.Endpoint> Endpoints { get; set; }
    private DbSet<RefreshToken> RefreshTokens { get; set; }
    private DbSet<Badge> Badges { get; set; }
    // ReSharper restore UnusedMember.Local

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserIdentity>()
            .HasOne(ui => ui.User)
            .WithMany(u => u.Identities)
            .HasForeignKey(ui => ui.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ApiKey>()
            .HasOne(ak => ak.User)
            .WithMany(u => u.ApiKeys)
            .HasForeignKey(ak => ak.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasOne(aku => aku.ApiKey)
            .WithMany(ak => ak.UsageRecords)
            .HasForeignKey(aku => aku.ApiKeyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserIdentity>()
            .Property(ui => ui.ConnectedAt)
            .HasDefaultValueSql("TIMEZONE('UTC', NOW())");

        modelBuilder.Entity<ApiKey>()
            .HasIndex(k => k.KeyHash);

        modelBuilder.Entity<ApiKey>()
            .HasIndex(k => k.UserId);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => u.ApiKeyId);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => u.UserId);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => u.RequestedAt);

        modelBuilder.Entity<Models.Endpoint>()
            .HasIndex(e => e.Path)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // UserIdentity indexes for fast lookups by provider
        modelBuilder.Entity<UserIdentity>()
            .HasIndex(ui => new { ui.Provider, ui.ProviderUserId })
            .IsUnique();

        modelBuilder.Entity<UserIdentity>()
            .HasIndex(ui => ui.UserId);

        modelBuilder.Entity<UserIdentity>()
            .HasIndex(ui => ui.Provider);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.Token)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.UserId);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => new { t.UserId, t.IsRevoked, t.ExpiresAt });

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.ExpiresAt);

        modelBuilder.Entity<FileData>()
            .HasIndex(f => f.UserId);

        modelBuilder.Entity<FileData>()
            .HasIndex(f => f.ApiKeyId);

        modelBuilder.Entity<ScanRecord>()
            .HasIndex(s => s.UserId);

        modelBuilder.Entity<ScanRecord>()
            .HasIndex(s => s.ApiKeyId);

        modelBuilder.Entity<Badge>()
            .HasIndex(b => b.UserId);

        modelBuilder.Entity<Badge>()
            .HasIndex(b => b.LinkedFileHash);

        modelBuilder.Entity<Badge>()
            .HasIndex(b => b.UpdatedAt);

        modelBuilder.Entity<ChunkUploadSession>()
            .HasIndex(c => c.ClientIpAddress);

        modelBuilder.Entity<ChunkUploadSession>()
            .HasIndex(c => c.ExpiresAt);

        modelBuilder.Entity<FileData>()
            .HasIndex(f => f.AddDateTime);

        modelBuilder.Entity<ScanRecord>()
            .HasIndex(s => s.ScanDate);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => new { u.UserId, u.RequestedAt });
    }
}