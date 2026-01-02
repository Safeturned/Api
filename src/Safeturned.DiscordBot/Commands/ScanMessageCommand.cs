using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using Safeturned.DiscordBot.Helpers;
using Safeturned.DiscordBot.Services;

namespace Safeturned.DiscordBot.Commands;

public class ScanMessageCommand : InteractionModuleBase<SocketInteractionContext>
{
    private readonly SafeturnedApiClient _apiClient;
    private readonly GuildConfigService _guildConfig;
    private readonly HttpClient _httpClient;
    private readonly string _webBaseUrl;
    private static readonly string[] AllowedExtensions = [".dll"];

    public ScanMessageCommand(
        SafeturnedApiClient apiClient,
        GuildConfigService guildConfig,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _apiClient = apiClient;
        _guildConfig = guildConfig;
        _httpClient = httpClientFactory.CreateClient();
        _webBaseUrl = configuration.GetRequiredString("SafeturnedWebUrl").TrimEnd('/');
    }

    [MessageCommand("Scan File")]
    public async Task ScanMessageAsync(IMessage message)
    {
        await DeferAsync();

        try
        {
            var attachments = message.Attachments
                .Where(a => AllowedExtensions.Contains(Path.GetExtension(a.Filename).ToLowerInvariant()))
                .ToList();

            if (attachments.Count == 0)
            {
                await FollowupAsync(
                    embed: CreateErrorEmbed(
                        "No DLL Files Found",
                        "This message doesn't contain any `.dll` files to scan.\n\n" +
                        "Make sure the message has a `.dll` attachment."),
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

            var results = new List<(string fileName, AnalysisResult? result, string? error)>();

            foreach (var attachment in attachments)
            {
                try
                {
                    using var response = await _httpClient.GetAsync(attachment.Url);
                    if (!response.IsSuccessStatusCode)
                    {
                        results.Add((attachment.Filename, null, "Failed to download file"));
                        continue;
                    }

                    await using var fileStream = await response.Content.ReadAsStreamAsync();
                    var result = await _apiClient.AnalyzeFileAsync(fileStream, attachment.Filename, apiKey);
                    results.Add((attachment.Filename, result, null));
                }
                catch (SafeturnedApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    results.Add((attachment.Filename, null, "Rate limit exceeded"));
                }
                catch (SafeturnedApiException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    results.Add((attachment.Filename, null, "Invalid API key"));
                }
                catch (Exception ex)
                {
                    SentrySdk.CaptureException(ex);
                    results.Add((attachment.Filename, null, ex.Message));
                }
            }

            if (results.Count == 1)
            {
                var (fileName, result, error) = results[0];
                if (result != null)
                {
                    var embed = CreateResultEmbed(result, fileName);
                    var components = CreateResultComponents(result.Hash, _webBaseUrl);
                    await FollowupAsync(embed: embed, components: components);
                }
                else
                {
                    await FollowupAsync(
                        embed: CreateErrorEmbed("Analysis Failed", error ?? "Unknown error"),
                        ephemeral: true);
                }
            }
            else
            {
                var embeds = new List<Embed>();
                foreach (var (fileName, result, error) in results)
                {
                    if (result != null)
                    {
                        embeds.Add(CreateResultEmbed(result, fileName));
                    }
                    else
                    {
                        embeds.Add(CreateErrorEmbed($"Failed: {fileName}", error ?? "Unknown error"));
                    }
                }

                var successResults = results.Where(r => r.result != null).ToList();
                MessageComponent? components = null;
                if (successResults.Count == 1 && successResults[0].result != null)
                {
                    components = CreateResultComponents(successResults[0].result!.Hash, _webBaseUrl);
                }

                await FollowupAsync(embeds: embeds.ToArray(), components: components);
            }
        }
        catch (Exception ex)
        {
            SentrySdk.CaptureException(ex);
            await FollowupAsync(
                embed: CreateErrorEmbed("Analysis Failed", $"An unexpected error occurred: {ex.Message}"),
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
