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
    private DbSet<RefreshToken> RefreshTokens { get; set; }
    private DbSet<Badge> Badges { get; set; }
    // ReSharper restore UnusedMember.Local

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApiKey>()
            .HasIndex(k => k.KeyHash);

        modelBuilder.Entity<ApiKey>()
            .HasIndex(k => k.UserId);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => u.ApiKeyId);

        modelBuilder.Entity<ApiKeyUsage>()
            .HasIndex(u => u.RequestedAt);

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
            .HasIndex(t => t.Token);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.UserId);

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
    }
}