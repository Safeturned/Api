using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Asp.Versioning;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Helpers;
using Safeturned.Api.Jobs;
using Safeturned.Api.Jobs.Helpers;

namespace Safeturned.Api.Controllers;

internal record GitHubWebhookValidationResult(
    GitHubReleasePayload? Payload,
    string? ErrorMessage = null,
    int? ErrorStatusCode = null)
{
    public bool IsValid => ErrorMessage == null;
    public bool ShouldProcess => Payload != null;
}

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;
    private readonly int? _trustedAuthorId;
    private readonly string _trustedAuthorLogin;
    private readonly string _moduleLoaderSecret;
    private readonly string _moduleLoaderRepoName;
    private readonly string _modulePluginInstallerSecret;
    private readonly string _modulePluginInstallerRepoName;
    private readonly string _modulePluginSecret;
    private readonly string _modulePluginRepoName;

    public WebhooksController(IBackgroundJobClient backgroundJobClient, IConfiguration configuration, ILogger logger)
    {
        _backgroundJobClient = backgroundJobClient;
        _configuration = configuration;
        _logger = logger.ForContext<WebhooksController>();
        _trustedAuthorId = _configuration.GetValue<int?>("GitHub:TrustedAuthorId");
        _trustedAuthorLogin = _configuration.GetRequiredString("GitHub:TrustedAuthorLogin");
        _moduleLoaderSecret = _configuration.GetRequiredString("GitHub:ModuleLoaderWebhookSecret");
        _moduleLoaderRepoName = _configuration.GetRequiredString("GitHub:ModuleLoaderRepoName");
        _modulePluginInstallerSecret = _configuration.GetRequiredString("GitHub:ModulePluginInstallerWebhookSecret");
        _modulePluginInstallerRepoName = _configuration.GetRequiredString("GitHub:ModulePluginInstallerRepoName");
        _modulePluginSecret = _configuration.GetRequiredString("GitHub:ModulePluginWebhookSecret");
        _modulePluginRepoName = _configuration.GetRequiredString("GitHub:ModulePluginRepoName");
    }

    [HttpPost("github/loaders/{pluginFramework}")]
    public async Task<IActionResult> HandleLoaderRelease(string pluginFramework)
    {
        var normalizedPluginFramework = Normalize(pluginFramework);
        string secret;
        string expectedRepoName;
        switch (normalizedPluginFramework)
        {
            case PluginConstants.ModuleFrameworkName:
                secret = _moduleLoaderSecret;
                expectedRepoName = _moduleLoaderRepoName;
                break;
            default:
                return NotFound(new { error = $"Unknown framework '{pluginFramework}'" });
        }

        var validation = await ValidateRequestAsync(secret, expectedRepoName);
        if (!validation.IsValid)
        {
            return StatusCode(validation.ErrorStatusCode!.Value, new { error = validation.ErrorMessage });
        }

        if (!validation.ShouldProcess)
        {
            return Ok();
        }

        var payload = validation.Payload!;
        var asset = payload.Release.Assets?.FirstOrDefault();
        var downloadUrl = asset?.BrowserDownloadUrl ?? string.Empty;
        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            _logger.Warning("No asset download URL found in release {Tag}", payload.Release.TagName);
            return BadRequest(new { error = "No asset download URL" });
        }

        var version = payload.Release.TagName ?? string.Empty;
        var repoName = payload.Repository.Name ?? string.Empty;
        var configuration = PluginConstants.ReleaseConfiguration;
        var assetName = asset?.Name ?? string.Empty;

        _backgroundJobClient.Enqueue<LoadersCdJob>(job =>
            job.ProcessAsync(null!, repoName, normalizedPluginFramework, configuration, version, downloadUrl,
                string.Empty, true, assetName, CancellationToken.None));

        _logger.Information(
            "Enqueued loader release from GitHub for repo {Repo}, framework {Framework}, version {Version}", repoName,
            normalizedPluginFramework, version);

        return Ok();
    }

    [HttpPost("github/plugin-installer/{pluginFramework}")]
    public async Task<IActionResult> HandlePluginInstallerRelease(string pluginFramework)
    {
        var normalizedPluginFramework = Normalize(pluginFramework);
        string secret;
        string expectedRepoName;
        switch (normalizedPluginFramework)
        {
            case PluginConstants.ModuleFrameworkName:
                secret = _modulePluginInstallerSecret;
                expectedRepoName = _modulePluginInstallerRepoName;
                break;
            default:
                return NotFound(new { error = $"Unknown framework '{pluginFramework}'" });
        }

        var validation = await ValidateRequestAsync(secret, expectedRepoName);
        if (!validation.IsValid)
        {
            return StatusCode(validation.ErrorStatusCode!.Value, new { error = validation.ErrorMessage });
        }

        if (!validation.ShouldProcess)
        {
            return Ok();
        }

        var payload = validation.Payload!;
        var asset = payload.Release.Assets?.FirstOrDefault();
        var downloadUrl = asset?.BrowserDownloadUrl ?? string.Empty;
        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            _logger.Warning("No asset download URL found in plugin installer release {Tag}", payload.Release.TagName);
            return BadRequest(new { error = "No asset download URL" });
        }

        var version = payload.Release.TagName ?? string.Empty;
        var repoName = payload.Repository.Name ?? string.Empty;
        var assetName = asset?.Name ?? string.Empty;

        _backgroundJobClient.Enqueue<PluginInstallerCdJob>(job =>
            job.ProcessAsync(null!, repoName, normalizedPluginFramework, version, downloadUrl, string.Empty, true, assetName,
                CancellationToken.None));

        _logger.Information("Enqueued plugin installer release from GitHub for repo {Repo}, framework {Framework}, version {Version}",
            repoName, normalizedPluginFramework, version);

        return Ok();
    }

    [HttpPost("github/plugin/{pluginFramework}")]
    public async Task<IActionResult> HandlePluginRelease(string pluginFramework)
    {
        var normalizedPluginFramework = Normalize(pluginFramework);
        string secret;
        string expectedRepoName;
        switch (normalizedPluginFramework)
        {
            case PluginConstants.ModuleFrameworkName:
                secret = _modulePluginSecret;
                expectedRepoName = _modulePluginRepoName;
                break;
            default:
                return NotFound(new { error = $"Unknown framework '{pluginFramework}'" });
        }

        var validation = await ValidateRequestAsync(secret, expectedRepoName);
        if (!validation.IsValid)
        {
            return StatusCode(validation.ErrorStatusCode!.Value, new { error = validation.ErrorMessage });
        }

        if (!validation.ShouldProcess)
        {
            return Ok();
        }

        var payload = validation.Payload!;
        var asset = payload.Release.Assets?.FirstOrDefault();
        var downloadUrl = asset?.BrowserDownloadUrl ?? string.Empty;
        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            _logger.Warning("No asset download URL found in plugin installer release {Tag}", payload.Release.TagName);
            return BadRequest(new { error = "No asset download URL" });
        }

        var version = payload.Release.TagName ?? string.Empty;
        var repoName = payload.Repository.Name ?? string.Empty;
        var assetName = asset?.Name ?? string.Empty;

        _backgroundJobClient.Enqueue<PluginsCdJob>(job =>
            job.ProcessAsync(null!, repoName, normalizedPluginFramework, version, downloadUrl, string.Empty, true, assetName,
                CancellationToken.None));

        _logger.Information("Enqueued plugin release from GitHub for repo {Repo}, framework {Framework}, version {Version}",
            repoName, normalizedPluginFramework, version);

        return Ok();
    }

    private async Task<GitHubWebhookValidationResult> ValidateRequestAsync(string secret, string expectedRepoName)
    {
        var signatureHeader = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return new GitHubWebhookValidationResult(null, "Missing signature", StatusCodes.Status401Unauthorized);
        }

        string body;
        using (var reader = new StreamReader(Request.Body))
        {
            body = await reader.ReadToEndAsync();
        }

        if (!VerifyGitHubSignature(secret, body, signatureHeader))
        {
            return new GitHubWebhookValidationResult(null, "Invalid signature", StatusCodes.Status401Unauthorized);
        }

        GitHubReleasePayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<GitHubReleasePayload>(body);
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Failed to deserialize GitHub payload");
            return new GitHubWebhookValidationResult(null, "Invalid payload", StatusCodes.Status400BadRequest);
        }

        if (payload?.Action != "published" || payload.Release == null)
        {
            return new GitHubWebhookValidationResult(null);
        }

        if (payload.Release.Author == null || payload.Release.Author.Id != _trustedAuthorId || !string.Equals(payload.Release.Author.Login, _trustedAuthorLogin, StringComparison.Ordinal))
        {
            _logger.Warning("Blocked release from unauthorized author ID: {AuthorId} Login: {AuthorLogin}", payload.Release.Author?.Id, payload.Release.Author?.Login);
            return new GitHubWebhookValidationResult(null, "Forbidden", StatusCodes.Status403Forbidden);
        }

        if (payload.Repository == null || !string.Equals(payload.Repository.Name, expectedRepoName, StringComparison.Ordinal))
        {
            _logger.Warning("Blocked release from unexpected repo: {Repo}", payload.Repository?.Name);
            return new GitHubWebhookValidationResult(null, "Forbidden", StatusCodes.Status403Forbidden);
        }

        return new GitHubWebhookValidationResult(payload);
    }

    private static bool VerifyGitHubSignature(string secret, string payload, string signatureHeader)
    {
        if (!signatureHeader.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var expectedHashHex = signatureHeader.Substring("sha256=".Length);
        byte[] expectedHash;
        try
        {
            expectedHash = Convert.FromHexString(expectedHashHex);
        }
        catch
        {
            return false;
        }

        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var computedHash = hmac.ComputeHash(payloadBytes);
        return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
    }

    private static string Normalize(string value) => (value ?? string.Empty).Trim().ToLowerInvariant();
}

internal class GitHubReleasePayload
{
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    [JsonPropertyName("repository")]
    public GitHubRepository? Repository { get; set; }

    [JsonPropertyName("release")]
    public GitHubRelease? Release { get; set; }
}

internal class GitHubRepository
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

internal class GitHubRelease
{
    [JsonPropertyName("tag_name")]
    public string? TagName { get; set; }

    [JsonPropertyName("author")]
    public GitHubAuthor? Author { get; set; }

    [JsonPropertyName("assets")]
    public List<GitHubAsset>? Assets { get; set; }
}

internal class GitHubAuthor
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("login")]
    public string? Login { get; set; }
}

internal class GitHubAsset
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("browser_download_url")]
    public string? BrowserDownloadUrl { get; set; }
}