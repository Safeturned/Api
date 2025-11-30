using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;
using Microsoft.Net.Http.Headers;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Helpers;

public static class HttpContextExtensions
{
    public static bool TryGetUserAgent(this HttpContext source, string value)
    {
        if (!TryGetUserAgent(source, out var userAgent))
        {
            return false;
        }
        return userAgent == value;
    }
    public static bool TryGetUserAgent(this HttpContext source, [NotNullWhen(true)] out string? name)
    {
        name = null;
        var headers = source.Request.Headers;
        if (!headers.TryGetValue(HeaderNames.UserAgent, out var userAgentStringValues))
        {
            return false;
        }
        name = userAgentStringValues.ToString();
        return true;
    }
    /// <summary>
    /// Gets the client IP address, handling proxy scenarios securely.
    /// Priority: CF-CONNECTING-IP (Cloudflare) > RemoteIpAddress > X-Forwarded-For rightmost
    /// </summary>
    public static string GetIPAddress(this HttpContext source)
    {
        if (!string.IsNullOrEmpty(source.Request.Headers[NetworkConstants.CloudflareIpHeader]))
        {
            return source.Request.Headers[NetworkConstants.CloudflareIpHeader]!.ToString();
        }

        var remoteIp = source.Connection.RemoteIpAddress?.ToString();
        if (!string.IsNullOrEmpty(remoteIp) && remoteIp != NetworkConstants.LocalhostIpV6 && remoteIp != NetworkConstants.LocalhostIpV4)
        {
            return remoteIp;
        }

        var forwardedFor = source.Request.Headers[NetworkConstants.ForwardedForHeader].ToString();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            var addresses = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (addresses.Length > 0)
            {
                var rightmostIp = addresses[addresses.Length - 1];
                if (System.Net.IPAddress.TryParse(rightmostIp, out _))
                {
                    return rightmostIp;
                }
            }
        }

        return remoteIp ?? NetworkConstants.UnknownIpAddress;
    }
    public static string GetIPAddress(this IHttpContextAccessor accessor)
    {
        return GetIPAddress(accessor.HttpContext!);
    }
    public static (Guid? userId, Guid? apiKeyId) GetUserContext(this HttpContext httpContext)
    {
        var userId = httpContext.Items[HttpContextItemKeys.UserId] as Guid?;
        var apiKeyId = httpContext.Items[HttpContextItemKeys.ApiKeyId] as Guid?;
        if (userId == null)
        {
            var user = httpContext.User;
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst(AuthConstants.SubClaim)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                userId = parsedUserId;
            }
        }
        return (userId, apiKeyId);
    }
}