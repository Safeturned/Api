using Hangfire.Console;
using Hangfire.Server;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Sentry.Hangfire;

namespace Safeturned.Api.Jobs;

public class RevokeAllApiKeysJob
{
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public RevokeAllApiKeysJob(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory;
    }

    [SentryMonitorSlug("revoke-all-api-keys")]
    public async Task<int> RevokeAllApiKeysAsync(PerformContext context, CancellationToken cancellationToken = default)
    {
        context.WriteLine("Starting revocation of all active API keys");

        await using var scope = _serviceScopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var activeKeys = await db.Set<ApiKey>()
            .Where(k => k.IsActive)
            .ToListAsync(cancellationToken);

        var revokedCount = 0;

        if (activeKeys.Count > 0)
        {
            foreach (var key in activeKeys)
            {
                key.IsActive = false;
                revokedCount++;
            }

            await db.SaveChangesAsync(cancellationToken);

            context.WriteLine("Successfully revoked {0} active API keys", revokedCount);
        }
        else
        {
            context.WriteLine("No active API keys found to revoke");
        }

        return revokedCount;
    }
}
