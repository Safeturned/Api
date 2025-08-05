using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using Microsoft.EntityFrameworkCore;

namespace Safeturned.Api.Database;

public class FilesDbContext : DbContext
{
#pragma warning disable CS8618
    public FilesDbContext(DbContextOptions<FilesDbContext> options) : base(options)
#pragma warning restore CS8618
    {
    }

    [SuppressMessage("ReSharper", "UnusedMember.Local", MessageId = "Used externally by Set<T>()")]
    private DbSet<FileData> Files { get; set; }
}

public class FileData
{
    [Key] public string Hash { get; set; }
    public int Score { get; set; }
    public string? FileName { get; set; }
    public long SizeBytes { get; set; }
    public string? DetectedType { get; set; }
    public DateTime AddDateTime { get; set; }
    public DateTime LastScanned { get; set; }
    public int TimesScanned { get; set; }
}