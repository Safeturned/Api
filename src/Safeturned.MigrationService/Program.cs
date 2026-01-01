using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Safeturned.DiscordBot.Database;
using Safeturned.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHostedService<Worker>();
builder.AddNpgsqlDbContext<BotDbContext>("safeturned-botdb", configureDbContextOptions: options =>
{
    options.UseNpgsql(npgsql => npgsql.MigrationsAssembly("Safeturned.MigrationService"));
    options.UseAsyncSeeding(async (dbContext, _, ct) =>
    {
        if (dbContext is BotDbContext context)
        {
            // Seed here - for a future
        }
    });
});

var host = builder.Build();
host.Run();
