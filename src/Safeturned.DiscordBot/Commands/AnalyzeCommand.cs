using Discord;
using Discord.Interactions;
using Microsoft.Extensions.Configuration;
using Safeturned.DiscordBot.Helpers;
using Safeturned.DiscordBot.Services;
using Serilog;

namespace Safeturned.DiscordBot.Commands;

public class AnalyzeCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly SafeturnedApiClient _apiClient;
    private readonly GuildConfigService _guildConfig;
    private readonly HttpClient _httpClient;
    private readonly string _webBaseUrl;
    private readonly ILogger _logger;
    private static readonly string[] AllowedExtensions = [".dll"];

    public AnalyzeCommand(
        SafeturnedApiClient apiClient,
        GuildConfigService guildConfig,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger logger)
    {
        _apiClient = apiClient;
        _guildConfig = guildConfig;
        _httpClient = httpClientFactory.CreateClient();
        _webBaseUrl = configuration.GetRequiredString("SafeturnedWebUrl").TrimEnd('/');
        _logger = logger.ForContext<AnalyzeCommand>();
    }

    [SlashCommand("analyze", "Analyze a .dll plugin file for security threats")]
    public async Task AnalyzeAsync([Summary("file", "The .dll file to analyze")] IAttachment file)
    {
        await DeferAsync();

        try
        {
            var extension = Path.GetExtension(file.Filename).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed("Invalid File Type", $"Only `.dll` files are supported. You uploaded: `{extension}`"),
                    ephemeral: true);
                return;
            }

            string? apiKey = null;
            if (!_guildConfig.IsOfficialGuild(Context.Guild.Id))
            {
                apiKey = await _guildConfig.GetApiKeyAsync(Context.Guild.Id);
                if (string.IsNullOrEmpty(apiKey))
                {
                    await FollowupAsync(
                        embed: CreateErrorEmbed(
                            "API Key Required",
                            "This server hasn't been configured with a Safeturned API key.\n\n" +
                            "A server administrator needs to run `/setup` with a valid API key.\n" +
                            "Get your API key at [safeturned.com/dashboard](https://safeturned.com/dashboard)"),
                        ephemeral: true);
                    return;
                }
            }

            using var response = await _httpClient.GetAsync(file.Url);
            if (!response.IsSuccessStatusCode)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed("Download Failed", "Failed to download the attachment."),
                    ephemeral: true);
                return;
            }

            await using var fileStream = await response.Content.ReadAsStreamAsync();

            var result = await _apiClient.AnalyzeFileAsync(fileStream, file.Filename, apiKey);

            if (result == null)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed("Analysis Failed", "Failed to analyze the file. Please try again."),
                    ephemeral: true);
                return;
            }

            var embed = CreateResultEmbed(result, file.Filename);
            var components = CreateResultComponents(result.Hash, _webBaseUrl);

            await FollowupAsync(embed: embed, components: components);
        }
        catch (SafeturnedApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            await FollowupAsync(
                embed: CreateErrorEmbed(
                    "Rate Limit Exceeded",
                    "You've exceeded your API rate limit.\n" +
                    "Use `/usage` to check your limits or upgrade your plan at [safeturned.com/pricing](https://safeturned.com/pricing)"),
                ephemeral: true);
        }
        catch (SafeturnedApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            await FollowupAsync(
                embed: CreateErrorEmbed(
                    "Invalid API Key",
                    "The configured API key is invalid.\n" +
                    "A server administrator needs to run `/setup` with a valid API key."),
                ephemeral: true);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to analyze file {FileName} in guild {GuildId}", file.Filename, Context.Guild.Id);
            SentrySdk.CaptureException(ex);
            await FollowupAsync(
                embed: CreateErrorEmbed("Analysis Failed", "Something went wrong while analyzing. Please try again later."),
                ephemeral: true);
        }
    }

    private static Embed CreateResultEmbed(AnalysisResult result, string originalFileName)
    {
        var (color, emoji, riskLabel) = GetRiskInfo(result.Score);

        var builder = new EmbedBuilder()
            .WithTitle($"{emoji} {riskLabel}")
            .WithColor(color)
            .WithDescription($"**{originalFileName}**")
            .AddField("Risk Score", $"**{(int)result.Score}**/100", inline: true)
            .AddField("File Type", string.IsNullOrWhiteSpace(result.DetectedType) ? "Unknown" : result.DetectedType, inline: true)
            .AddField("Size", FormatFileSize(result.SizeBytes), inline: true)
            .WithFooter("Safeturned Plugin Security Scanner", "https://safeturned.com/favicon.ico")
            .WithTimestamp(result.LastScanned);

        if (result.Detections?.Length > 0)
        {
            var detectionText = string.Join("\n", result.Detections.Take(5).Select(d => $"• {d}"));

            if (result.Detections.Length > 5)
            {
                detectionText += $"\n*...and {result.Detections.Length - 5} more*";
            }

            builder.AddField($"Checks ({result.Detections.Length})", detectionText);
        }
        else
        {
            builder.AddField("Detections", "No threats detected ✅");
        }

        return builder.Build();
    }

    private static MessageComponent CreateResultComponents(string hash, string baseUrl)
    {
        var urlSafeHash = hash
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        return new ComponentBuilder()
            .WithButton("View Full Report", style: ButtonStyle.Link, url: $"{baseUrl}/result/{urlSafeHash}")
            .Build();
    }

    private static (Color color, string emoji, string label) GetRiskInfo(float score)
    {
        return score switch
        {
            >= 75 => (new Color(255, 71, 87), "🚨", "DANGEROUS"),
            >= 50 => (new Color(255, 165, 2), "⚠️", "SUSPICIOUS"),
            >= 25 => (new Color(255, 217, 61), "⚡", "CAUTION"),
            _ => (new Color(46, 213, 115), "✅", "SAFE")
        };
    }

    private static Embed CreateErrorEmbed(string title, string description)
    {
        return new EmbedBuilder()
            .WithTitle($"❌ {title}")
            .WithDescription(description)
            .WithColor(Color.Red)
            .Build();
    }

    private static string FormatFileSize(long bytes)
    {
        return bytes switch
        {
            < 1024 => $"{bytes} B",
            < 1024 * 1024 => $"{bytes / 1024.0:F1} KB",
            _ => $"{bytes / 1024.0 / 1024.0:F2} MB"
        };
    }
}
