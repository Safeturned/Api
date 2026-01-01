using System.Reflection;
using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Safeturned.DiscordBot.Helpers;
using Serilog;

namespace Safeturned.DiscordBot.Services;

public class InteractionHandler
{
    private readonly DiscordSocketClient _client;
    private readonly InteractionService _interactions;
    private readonly IServiceProvider _services;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;

    public InteractionHandler(
        DiscordSocketClient client,
        InteractionService interactions,
        IServiceProvider services,
        IConfiguration configuration,
        ILogger logger)
    {
        _client = client;
        _interactions = interactions;
        _services = services;
        _configuration = configuration;
        _logger = logger.ForContext<InteractionHandler>();
    }

    public async Task InitializeAsync()
    {
        await _interactions.AddModulesAsync(Assembly.GetExecutingAssembly(), _services);

        _client.InteractionCreated += HandleInteractionAsync;
        _interactions.SlashCommandExecuted += SlashCommandExecutedAsync;
    }

    public async Task RegisterCommandsAsync()
    {
        var officialGuildId = _configuration.GetRequiredString("OfficialGuildId");

        if (ulong.TryParse(officialGuildId, out var guildId))
        {
            await _interactions.RegisterCommandsToGuildAsync(guildId);
            _logger.Information("Commands registered to official guild {GuildId}", guildId);
        }

        await _interactions.RegisterCommandsGloballyAsync();
        _logger.Information("Commands registered globally");
    }

    private async Task HandleInteractionAsync(SocketInteraction interaction)
    {
        try
        {
            var context = new SocketInteractionContext(_client, interaction);
            await _interactions.ExecuteCommandAsync(context, _services);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error handling interaction");

            if (interaction.Type == InteractionType.ApplicationCommand && !interaction.HasResponded)
            {
                try
                {
                    await interaction.RespondAsync(
                        "An error occurred while processing your command.",
                        ephemeral: true);
                }
                catch
                {
                    // Interaction may have timed out
                }
            }
        }
    }

    private Task SlashCommandExecutedAsync(SlashCommandInfo info, IInteractionContext context, IResult result)
    {
        if (!result.IsSuccess)
        {
            _logger.Warning(
                "Command {CommandName} failed: {Error} ({ErrorReason})",
                info.Name,
                result.Error,
                result.ErrorReason);
        }

        return Task.CompletedTask;
    }
}
