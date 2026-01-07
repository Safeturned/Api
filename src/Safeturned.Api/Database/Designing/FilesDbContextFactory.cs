using JetBrains.Annotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Safeturned.Api.Database.Designing;

#if DEBUG
[UsedImplicitly]
public class FilesDbContextFactory : IDesignTimeDbContextFactory<FilesDbContext>
{
    public FilesDbContext CreateDbContext(string[] args)
    {
        // Local development connection string.
        const string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=uSw6rDJDBMziNvv1ypIL;Database=safeturned_files;";
        var options = new DbContextOptionsBuilder<FilesDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new FilesDbContext(options);
    }
}
#endif