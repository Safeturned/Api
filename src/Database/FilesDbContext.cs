using System.Diagnostics.CodeAnalysis;
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

    [SuppressMessage("ReSharper", "UnusedMember.Local", MessageId = "Used externally by Set<T>()")]
    private DbSet<FileData> Files { get; set; }
    [SuppressMessage("ReSharper", "UnusedMember.Local", MessageId = "Used externally by Set<T>()")]
    private DbSet<ScanRecord> Scans { get; set; }
    [SuppressMessage("ReSharper", "UnusedMember.Local", MessageId = "Used externally by Set<T>()")]
    private DbSet<ChunkUploadSession> ChunkUploadSessions { get; set; }
}