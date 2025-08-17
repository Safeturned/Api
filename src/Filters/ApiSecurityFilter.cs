using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Safeturned.Api.Models;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ApiSecurityFilter : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var securitySettings = context.HttpContext.RequestServices.GetRequiredService<IOptions<SecuritySettings>>().Value;
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger>().ForContext<ApiSecurityFilter>();
        if (securitySettings.RequireApiKey)
        {
            if (!ValidateApiKey(context, securitySettings.ApiKey))
            {
                logger.Warning("Invalid or missing API key from {IPAddress}", context.HttpContext.Connection.RemoteIpAddress);
                context.Result = new UnauthorizedObjectResult(new { error = "Invalid API key" });
                return;
            }
        }
        if (securitySettings.RequireOriginValidation)
        {
            if (!ValidateOrigin(context, securitySettings.AllowedOrigins))
            {
                logger.Warning("Invalid origin from {IPAddress}: {Origin}", context.HttpContext.Connection.RemoteIpAddress, context.HttpContext.Request.Headers.Origin.ToString());
                context.Result = new ForbidResult();
                return;
            }
        }
        await next();
    }

    private static bool ValidateApiKey(ActionExecutingContext context, string expectedApiKey)
    {
        var apiKey = context.HttpContext.Request.Headers["X-API-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(apiKey) && apiKey == expectedApiKey;
    }

    private static bool ValidateOrigin(ActionExecutingContext context, string[] allowedOrigins)
    {
        var origin = context.HttpContext.Request.Headers.Origin.ToString();
        var referer = context.HttpContext.Request.Headers.Referer.ToString();
        if (allowedOrigins == null || allowedOrigins.Length == 0)
        {
            return true;
        }
        if (!string.IsNullOrEmpty(origin) && allowedOrigins.Contains(origin))
        {
            return true;
        }
        if (!string.IsNullOrEmpty(referer))
        {
            return allowedOrigins.Any(allowedOrigin =>
                referer.StartsWith(allowedOrigin, StringComparison.OrdinalIgnoreCase));
        }
        var forwardedHost = context.HttpContext.Request.Headers["X-Forwarded-Host"].ToString();
        if (!string.IsNullOrEmpty(forwardedHost))
        {
            var forwardedHostName = forwardedHost.Split(',')[0].Trim(); // Take first host if multiple
            return allowedOrigins.Any(allowedOrigin => forwardedHostName.Equals(allowedOrigin.Replace("https://", "").Replace("http://", ""), StringComparison.OrdinalIgnoreCase));
        }
        var hostHeader = context.HttpContext.Request.Headers.Host.ToString();
        if (!string.IsNullOrEmpty(hostHeader))
        {
            return allowedOrigins.Any(allowedOrigin =>
                hostHeader.Equals(allowedOrigin.Replace("https://", "").Replace("http://", ""), StringComparison.OrdinalIgnoreCase));
        }
        return false;
    }
}
