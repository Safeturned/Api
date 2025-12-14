using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Constants;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/frameworks/{framework}/config")]
public class ModuleConfigController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public IActionResult GetDefaultConfig([FromRoute] string framework)
    {
        var normalized = (framework ?? string.Empty).Trim().ToLowerInvariant();

        var defaults = normalized == PluginConstants.ModuleFrameworkName
            ? new
            {
                watchPaths = new[] { "Modules", "Rocket/Plugins", "OpenMod/plugins" },
                includePatterns = new[] { "*.dll" },
                excludePatterns = Array.Empty<string>()
            }
            : new
            {
                watchPaths = Array.Empty<string>(),
                includePatterns = new[] { "*.dll" },
                excludePatterns = Array.Empty<string>()
            };

        return Ok(defaults);
    }
}
