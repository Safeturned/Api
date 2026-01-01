using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/plugin-installer")]
public class PluginInstallerController : ControllerBase
{
    private readonly IPluginInstallerReleaseService _releaseService;
    private readonly ILogger _logger;

    public PluginInstallerController(IPluginInstallerReleaseService releaseService, ILogger logger)
    {
        _releaseService = releaseService;
        _logger = logger.ForContext<PluginInstallerController>();
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPluginInstallerAsync([FromQuery] string framework, [FromQuery] string? version, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(framework))
        {
            return BadRequest(new { error = "Framework parameter is required" });
        }

        PluginInstallerRelease? release;
        if (string.IsNullOrWhiteSpace(version) || version.Equals(PluginConstants.LatestVersion, StringComparison.OrdinalIgnoreCase))
        {
            release = await _releaseService.GetLatestAsync(framework, cancellationToken);
        }
        else
        {
            release = await _releaseService.GetByVersionAsync(framework, version, cancellationToken);
        }

        if (release == null)
        {
            return NotFound(new
            {
                error = "PluginInstaller not uploaded yet",
                detail = "PluginInstaller is not present on the server yet; try again later."
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
