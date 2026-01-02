using Discord;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Safeturned.DiscordBot.Helpers;
using Serilog;
using Serilog.Events;

namespace Safeturned.DiscordBot.Services;

public class BotService : IHostedService
{
    private readonly DiscordSocketClient _client;
    private readonly InteractionHandler _interactionHandler;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;

    public BotService(
        DiscordSocketClient client,
        InteractionHandler interactionHandler,
        IConfiguration configuration,
        ILogger logger)
    {
        _client = client;
        _interactionHandler = interactionHandler;
        _configuration = configuration;
        _logger = logger.ForContext<BotService>();
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _client.Log += LogAsync;
        _client.Ready += ReadyAsync;

        await _interactionHandler.InitializeAsync();
        await _client.LoginAsync(TokenType.Bot, _configuration.GetRequiredString("DiscordBotToken"));
        await _client.StartAsync();
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _client.Log -= LogAsync;
        _client.Ready -= ReadyAsync;

        await _client.StopAsync();
        await _client.LogoutAsync();
    }

    private async Task ReadyAsync()
    {
        _logger.Information("Bot is connected as {Username}", _client.CurrentUser.Username);
        await _interactionHandler.RegisterCommandsAsync();
    }

    private Task LogAsync(LogMessage log)
    {
        var level = log.Severity switch
        {
            LogSeverity.Critical => LogEventLevel.Fatal,
            LogSeverity.Error => LogEventLevel.Error,
            LogSeverity.Warning => LogEventLevel.Warning,
            LogSeverity.Info => LogEventLevel.Information,
            LogSeverity.Verbose => LogEventLevel.Debug,
            LogSeverity.Debug => LogEventLevel.Verbose,
            _ => LogEventLevel.Information
        };

        _logger.Write(level, log.Exception, "[{Source}] {Message}", log.Source, log.Message);
        return Task.CompletedTask;
    }
}
