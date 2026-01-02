using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Safeturned.DiscordBot.Helpers;

namespace Safeturned.DiscordBot.Services;

public class SafeturnedApiClient
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private const string ApiVersion = "v1.0";

    public SafeturnedApiClient(IConfiguration configuration, HttpClient httpClient)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(_configuration.GetRequiredString("SafeturnedApiUrl").TrimEnd('/') + "/");
    }

    public async Task<AnalysisResult?> AnalyzeFileAsync(Stream fileStream, string fileName, string? apiKey = null)
    {
        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(fileStream);
        content.Add(streamContent, "file", fileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{ApiVersion}/files");
        request.Content = content;

        if (!string.IsNullOrEmpty(apiKey))
        {
            request.Headers.Add("X-API-Key", apiKey);
        }
        else
        {
            var botApiKey = _configuration["SafeturnedBotApiKey"];
            if (!string.IsNullOrEmpty(botApiKey))
            {
                request.Headers.Add("X-API-Key", botApiKey);
            }
        }

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new SafeturnedApiException(response.StatusCode, error);
        }

        return await response.Content.ReadFromJsonAsync<AnalysisResult>();
    }

    public async Task<UsageInfo?> GetUsageAsync(string apiKey)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiVersion}/usage");
        request.Headers.Add("X-API-Key", apiKey);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new SafeturnedApiException(response.StatusCode, error);
        }

        return await response.Content.ReadFromJsonAsync<UsageInfo>();
    }

    public async Task<bool> ValidateApiKeyAsync(string apiKey)
    {
        try
        {
            await GetUsageAsync(apiKey);
            return true;
        }
        catch (SafeturnedApiException ex) when (ex.StatusCode == HttpStatusCode.Unauthorized)
        {
            return false;
        }
    }
}

public class AnalysisResult
{
    [JsonPropertyName("fileHash")]
    public string Hash { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public float Score { get; set; }

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("fileSizeBytes")]
    public long SizeBytes { get; set; }

    [JsonPropertyName("checked")]
    public bool Checked { get; set; }

    [JsonPropertyName("lastScanned")]
    public DateTime LastScanned { get; set; }

    [JsonPropertyName("checkedItems")]
    public string[]? Detections { get; set; }

    public string DetectedType => Checked ? "Assembly" : "Unknown";
}

public class UsageInfo
{
    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("requestsUsed")]
    public int RequestsUsed { get; set; }

    [JsonPropertyName("requestsLimit")]
    public int RequestsLimit { get; set; }

    [JsonPropertyName("resetAt")]
    public DateTime ResetAt { get; set; }
}

public class SafeturnedApiException : Exception
{
    public HttpStatusCode StatusCode { get; }
    public string ResponseBody { get; }

    public SafeturnedApiException(HttpStatusCode statusCode, string responseBody)
        : base($"API request failed with status {statusCode}: {responseBody}")
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }
}
