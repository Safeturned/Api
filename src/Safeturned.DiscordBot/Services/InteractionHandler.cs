using System.Reflection;
using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Safeturned.DiscordBot.Helpers;
using Serilog;

namespace Safeturned.DiscordBot.Services;

public class InteractionHandler
{
    private readonly DiscordSocketClient _client;
    private readonly InteractionService _interactions;
    private readonly IServiceProvider _services;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger _logger;

    public InteractionHandler(
        DiscordSocketClient client,
        InteractionService interactions,
        IServiceProvider services,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger logger)
    {
        _client = client;
        _interactions = interactions;
        _services = services;
        _configuration = configuration;
        _environment = environment;
        _logger = logger.ForContext<InteractionHandler>();
    }

    public async Task InitializeAsync()
    {
        await _interactions.AddModulesAsync(Assembly.GetExecutingAssembly(), _services);

        _client.InteractionCreated += HandleInteractionAsync;
        _interactions.SlashCommandExecuted += SlashCommandExecutedAsync;
        _interactions.ContextCommandExecuted += ContextCommandExecutedAsync;
    }

    public async Task RegisterCommandsAsync()
    {
        var officialGuildId = _configuration["OfficialGuildId"];

        if (_environment.IsDevelopment() && ulong.TryParse(officialGuildId, out var guildId))
        {
            await _interactions.RegisterCommandsToGuildAsync(guildId);
            _logger.Information("Commands registered to guild {GuildId} (Development mode)", guildId);
        }
        else
        {
            await _interactions.RegisterCommandsGloballyAsync();
            _logger.Information("Commands registered globally");
        }
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

    private Task ContextCommandExecutedAsync(ContextCommandInfo info, IInteractionContext context, IResult result)
    {
        if (!result.IsSuccess)
        {
            _logger.Warning(
                "Context command {CommandName} failed: {Error} ({ErrorReason})",
                info.Name,
                result.Error,
                result.ErrorReason);
        }
        else
        {
            _logger.Information(
                "Context command {CommandName} executed in guild {GuildId} by user {UserId}",
                info.Name,
                context.Guild?.Id,
                context.User.Id);
        }

        return Task.CompletedTask;
    }
}
