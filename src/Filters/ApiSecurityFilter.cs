using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Safeturned.Api.Constants;
using Safeturned.Api.Helpers;
using Safeturned.Api.Models;
using Safeturned.Api.Services;

namespace Safeturned.Api.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ApiSecurityFilter : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var securitySettings = context.HttpContext.RequestServices.GetRequiredService<IOptions<SecuritySettings>>().Value;
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger>().ForContext<ApiSecurityFilter>();
        var apiKeyService = context.HttpContext.RequestServices.GetService<IApiKeyService>();
        var clientTag = context.HttpContext.Request.Headers[AuthConstants.ClientHeader].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(clientTag) && clientTag.Length > ClientConstants.MaxClientTagLength)
        {
            clientTag = clientTag[..ClientConstants.MaxClientTagLength];
        }
        context.HttpContext.Items[HttpContextItemKeys.ClientTag] = clientTag;

        var startTimestamp = Stopwatch.GetTimestamp();

        if (securitySettings.RequireApiKey)
        {
            var apiKeyHeader = context.HttpContext.Request.Headers[AuthConstants.ApiKeyHeader].FirstOrDefault();
            if (!string.IsNullOrEmpty(apiKeyHeader) &&
                apiKeyService != null &&
                ApiKeyHelper.HasValidPrefix(apiKeyHeader))
            {
                var clientIp = context.HttpContext.GetIPAddress();
                var apiKey = await apiKeyService.ValidateApiKeyAsync(apiKeyHeader, clientIp);

                if (apiKey == null)
                {
                    logger.Warning("Invalid database API key from {IPAddress}", clientIp);
                    context.Result = new UnauthorizedObjectResult(new { error = "Invalid or expired API key" });
                    return;
                }

                context.HttpContext.Items[HttpContextItemKeys.UserId] = apiKey.UserId;
                context.HttpContext.Items[HttpContextItemKeys.ApiKeyId] = apiKey.Id;
                context.HttpContext.Items[HttpContextItemKeys.User] = apiKey.User;
                context.HttpContext.Items[HttpContextItemKeys.ApiKey] = apiKey;

                var requiredScope = GetRequiredScope(context);
                if (!string.IsNullOrEmpty(requiredScope) && !ApiKeyScopeHelper.HasScope(apiKey.Scopes, requiredScope))
                {
                    logger.Warning("API key {ApiKeyId} lacks required scope: {RequiredScope}", apiKey.Id, requiredScope);
                    context.Result = new ForbidResult();
                    return;
                }

                var executedContext = await next();
                var elapsedMs = (int)Stopwatch.GetElapsedTime(startTimestamp).TotalMilliseconds;

                await apiKeyService.LogApiKeyUsageAsync(
                    apiKey.Id,
                    context.HttpContext.Request.Path,
                    context.HttpContext.Request.Method,
                    executedContext.HttpContext.Response.StatusCode,
                    elapsedMs,
                    clientIp,
                    clientTag
                );
                await apiKeyService.UpdateLastUsedAsync(apiKey.Id);

                return;
            }
            else
            {
                logger.Warning("Invalid or missing API key from {IPAddress}", context.HttpContext.GetIPAddress());
                context.Result = new UnauthorizedObjectResult(new { error = "Invalid or missing API key" });
                return;
            }
        }

        if (securitySettings.RequireOriginValidation)
        {
            if (!ValidateOrigin(context, securitySettings.AllowedOrigins))
            {
                logger.Warning("Invalid origin from {IPAddress}: {Origin}", context.HttpContext.GetIPAddress(), context.HttpContext.Request.Headers.Origin.ToString());
                context.Result = new ForbidResult();
                return;
            }
        }

        await next();
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
        var forwardedHost = context.HttpContext.Request.Headers[NetworkConstants.ForwardedHostHeader].ToString();
        if (!string.IsNullOrEmpty(forwardedHost))
        {
            var forwardedHostName = forwardedHost.Split(',')[0].Trim(); // Take first host if multiple
            return allowedOrigins.Any(allowedOrigin => forwardedHostName.Equals(allowedOrigin.Replace("https://", "").Replace("http://", ""), StringComparison.OrdinalIgnoreCase));
        }
        var hostHeader = context.HttpContext.Request.Headers.Host.ToString();
        if (!string.IsNullOrEmpty(hostHeader))
        {
            return allowedOrigins.Any(allowedOrigin => hostHeader.Equals(allowedOrigin.Replace("https://", "").Replace("http://", ""), StringComparison.OrdinalIgnoreCase));
        }
        return false;
    }

    private static string? GetRequiredScope(ActionExecutingContext context)
    {
        var path = context.HttpContext.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (path.Contains("/files") && HttpMethods.IsPost(context.HttpContext.Request.Method))
        {
            return "analyze";
        }
        if (path.Contains("/runtime-scan"))
        {
            return "runtime-scan";
        }
        if (HttpMethods.IsPost(context.HttpContext.Request.Method))
        {
            return "read";
        }
        return null;
    }
}
