using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/loaders")]
public class LoadersController : ControllerBase
{
    private readonly ILoaderReleaseService _loaderReleaseService;
    private readonly ILogger _logger;

    public LoadersController(ILoaderReleaseService loaderReleaseService, ILogger logger)
    {
        _loaderReleaseService = loaderReleaseService;
        _logger = logger.ForContext<LoadersController>();
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetLoaderAsync([FromQuery] string framework, [FromQuery] string? configuration, [FromQuery] string? version, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(framework))
        {
            return BadRequest(new { error = "framework is required" });
        }

        configuration ??= PluginConstants.ReleaseConfiguration;

        LoaderRelease? release;
        if (string.IsNullOrWhiteSpace(version) || version.Equals(PluginConstants.LatestVersion, StringComparison.OrdinalIgnoreCase))
        {
            release = await _loaderReleaseService.GetLatestAsync(framework, configuration, ct);
        }
        else
        {
            release = await _loaderReleaseService.GetByVersionAsync(framework, configuration, version, ct);
        }

        if (release == null || release.Content == null)
        {
            return NotFound(new
            {
                error = "Loader not uploaded yet",
                detail = "Loader is not present on the server yet; try again later."
            });
        }

        var fileName = $"Safeturned.Loader_{release.Version}.zip";
        return File(release.Content, "application/zip", fileName);
    }

    [AllowAnonymous]
    [HttpGet("versions")]
    public async Task<IActionResult> GetLoaderVersionsAsync([FromQuery] string framework, [FromQuery] string? configuration, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(framework))
        {
            return BadRequest(new { error = "framework is required" });
        }

        configuration ??= PluginConstants.ReleaseConfiguration;

        var versions = await _loaderReleaseService.GetAllVersionsAsync(framework, configuration, ct);

        return Ok(versions.Select(v => new
        {
            v.Version,
            v.CreatedAt,
            v.IsLatest
        }));
    }
}
