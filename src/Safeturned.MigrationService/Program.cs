using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Safeturned.DiscordBot.Database;
using Safeturned.MigrationService;
using Safeturned.MigrationService.Seeding;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHostedService<Worker>();

var environment = builder.Environment;
var configuration = builder.Configuration;

var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());

builder.AddNpgsqlDbContext<BotDbContext>("safeturned-botdb", configureDbContextOptions: options =>
{
    options.UseNpgsql(npgsql => npgsql.MigrationsAssembly("Safeturned.MigrationService"));
    options.UseAsyncSeeding(async (dbContext, _, ct) =>
    {
        if (dbContext is BotDbContext context)
        {
            var logger = loggerFactory.CreateLogger<GuildApiKeySeed>();
            await new GuildApiKeySeed(context, logger, environment, configuration).SeedAsync(ct);
        }
    });
});

var host = builder.Build();
host.Run();
