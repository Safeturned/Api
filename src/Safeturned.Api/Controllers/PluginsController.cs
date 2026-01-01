using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/plugins")]
public class PluginsController : ControllerBase
{
    private readonly IPluginReleaseService _pluginReleaseService;
    private readonly ILogger _logger;

    public PluginsController(IPluginReleaseService pluginReleaseService, ILogger logger)
    {
        _pluginReleaseService = pluginReleaseService;
        _logger = logger.ForContext<PluginsController>();
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPluginAsync([FromQuery] string framework, [FromQuery] string? version, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(framework))
        {
            return BadRequest(new { error = "Framework parameter is required" });
        }

        PluginRelease? release;
        if (string.IsNullOrWhiteSpace(version) || version.Equals(PluginConstants.LatestVersion, StringComparison.OrdinalIgnoreCase))
        {
            release = await _pluginReleaseService.GetLatestAsync(framework, cancellationToken);
        }
        else
        {
            release = await _pluginReleaseService.GetByVersionAsync(framework, version, cancellationToken);
        }

        if (release == null)
        {
            return NotFound(new
            {
                error = "Plugin not uploaded yet",
                detail = "Plugin is not present on the server yet; try again later."
            });
        }

        return Ok(new
        {
            release.Framework,
            release.Version,
            release.PackedVersion,
            release.DownloadUrl,
            release.Sha256,
            release.SourceRepo,
            release.AssetName,
            release.CreatedAt,
            release.IsLatest
        });
    }
}
