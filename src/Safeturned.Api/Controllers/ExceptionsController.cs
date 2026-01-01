using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Safeturned.Api.Filters;
using Safeturned.Api.Models;

namespace Safeturned.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/exception")]
[ApiSecurityFilter]
public class ExceptionsController : ControllerBase
{
    private const int StackTraceMaxLength = 4000;
    private readonly ILogger _logger;

    public ExceptionsController(ILogger logger)
    {
        _logger = logger.ForContext<ExceptionsController>();
    }

    [HttpPost]
    public IActionResult ReportException([FromBody] ModuleExceptionRequest request)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { error = "Invalid payload" });
        }

        if (string.IsNullOrWhiteSpace(request.FrameworkName))
        {
            return BadRequest(new { error = "Framework parameter is required" });
        }

        var stack = request.StackTrace ?? string.Empty;
        if (stack.Length > StackTraceMaxLength)
        {
            stack = stack[..StackTraceMaxLength];
        }

        _logger.Warning("Module exception reported: {Type} - {Message}", request.Type ?? "Exception", request.Message);

        SentrySdk.CaptureEvent(new SentryEvent
        {
            Message = new SentryMessage { Formatted = $"Safeturned.Module exception ({request.Type ?? "Exception"}): {request.Message}" },
            Level = SentryLevel.Error
        }, scope =>
        {
            scope.SetTag("framework", request.FrameworkName);
            if (!string.IsNullOrWhiteSpace(request.ModuleVersion))
                scope.SetTag("module_version", request.ModuleVersion);

            if (!string.IsNullOrWhiteSpace(request.LoaderVersion))
                scope.SetTag("loader_version", request.LoaderVersion);

            if (!string.IsNullOrWhiteSpace(request.InstallerVersion))
                scope.SetTag("installer_version", request.InstallerVersion);

            scope.SetExtra("context", request.Context);
            scope.SetExtra("occurred_at_utc", request.OccurredAtUtc == default ? DateTime.UtcNow : request.OccurredAtUtc);
            scope.SetExtra("stack_trace", stack);
            scope.SetExtra("watch_paths", request.WatchPaths);
            scope.SetExtra("include_patterns", request.IncludePatterns);
            scope.SetExtra("exclude_patterns", request.ExcludePatterns);
            scope.SetExtra("force_analyze", request.ForceAnalyze);
            scope.SetExtra("max_concurrent_uploads", request.MaxConcurrentUploads);
            scope.SetExtra("ratelimit_tokens", request.RateLimitTokens);
            scope.SetExtra("ratelimit_limit", request.RateLimitLimit);
            scope.SetExtra("ratelimit_reset", request.RateLimitReset);
        });

        return Ok(new { status = "received" });
    }
}