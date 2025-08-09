using Microsoft.AspNetCore.Mvc;

namespace Safeturned.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly ILogger<HealthController> _logger;

    public HealthController(ILogger<HealthController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Health()
    {
        _logger.LogInformation("Health check requested");
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    [HttpGet("alive")]
    public IActionResult Alive()
    {
        return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
    }

    [HttpGet("ready")]
    public IActionResult Ready()
    {
        return Ok(new { status = "ready", timestamp = DateTime.UtcNow });
    }
}
