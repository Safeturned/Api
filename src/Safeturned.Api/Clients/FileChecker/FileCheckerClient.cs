using System.Text.Json;

namespace Safeturned.Api.Clients.FileChecker;

public interface IFileCheckerClient
{
    Task<FileCheckResult> AnalyzeAsync(Stream fileStream, CancellationToken cancellationToken = default);
    Task<bool> ValidateAsync(Stream fileStream, CancellationToken cancellationToken = default);
    Task<string> GetVersionAsync(CancellationToken cancellationToken = default);
}

public class FileCheckerClient(HttpClient httpClient) : IFileCheckerClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<FileCheckResult> AnalyzeAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(fileStream);
        content.Add(streamContent, "file", "assembly.dll");

        var response = await httpClient.PostAsync("/analyze", content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<FileCheckResult>(JsonOptions, cancellationToken);
        return result ?? throw new InvalidOperationException("Failed to deserialize FileChecker response");
    }

    public async Task<bool> ValidateAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(fileStream);
        content.Add(streamContent, "file", "assembly.dll");

        var response = await httpClient.PostAsync("/validate", content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<FileValidationResult>(JsonOptions, cancellationToken);
        return result?.Valid ?? false;
    }

    public async Task<string> GetVersionAsync(CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetFromJsonAsync<VersionResponse>("/version", JsonOptions, cancellationToken);
        return response?.Version ?? "unknown";
    }

    private record VersionResponse(string Version);
}
