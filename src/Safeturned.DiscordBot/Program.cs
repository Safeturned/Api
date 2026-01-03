using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Safeturned.DiscordBot.Database;
using Safeturned.DiscordBot.Helpers;
using Safeturned.DiscordBot.Services;
using Serilog;

var logger = Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = Host.CreateApplicationBuilder(args);
var config = builder.Configuration;
var services = builder.Services;

if (builder.Environment.IsDevelopment())
{
    config.AddUserSecrets<Program>();
}

builder.AddServiceDefaults();

services.AddSerilog((sp, lc) => lc
    .ReadFrom.Configuration(config)
    .ReadFrom.Services(sp)
    .Enrich.FromLogContext()
    .WriteTo.Console());

SentrySdk.Init(options =>
{
    var sentryConfig = config.GetRequiredSection("Sentry");
    sentryConfig.Bind(options);
    options.AddExceptionFilterForType<OperationCanceledException>();
});

builder.AddNpgsqlDbContext<BotDbContext>("botdb");

services.AddSingleton(new DiscordSocketConfig
{
    GatewayIntents = GatewayIntents.Guilds | GatewayIntents.GuildMessages,
    LogLevel = LogSeverity.Info,
    UseInteractionSnowflakeDate = false
});
services.AddSingleton(sp => new DiscordSocketClient(sp.GetRequiredService<DiscordSocketConfig>()));
services.AddSingleton(x => new InteractionService(x.GetRequiredService<DiscordSocketClient>()));

services.AddHttpClient<SafeturnedApiClient>();
services.AddSingleton<GuildConfigService>();
services.AddSingleton<InteractionHandler>();
services.AddSingleton<ChannelCleanupService>();

services.AddHostedService<BotService>();
services.AddHostedService(sp => sp.GetRequiredService<ChannelCleanupService>());

var host = builder.Build();
await host.RunAsync();