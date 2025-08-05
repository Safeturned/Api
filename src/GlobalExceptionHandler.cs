using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Safeturned.Api.Helpers;

namespace Safeturned.Api;

internal sealed class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        SentrySdk.CaptureException(exception, x => x.SetExtra("message", "Error in GlobalExceptionHandler"));
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { problem = "An unexpected error occurred." }, ct);
        return true;
    }
}