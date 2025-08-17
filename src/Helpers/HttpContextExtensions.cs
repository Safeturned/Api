using System.Diagnostics.CodeAnalysis;
using Microsoft.Net.Http.Headers;

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
    /// Cloudflare and Azure changes the actual client IP by replacing default headers to its own IPs of the Cloudflare or something else,
    /// this will get a real client IP instead.
    /// </summary>
    public static string GetIPAddress(this HttpContext source)
    {
        // Check X-Forwarded-For first (more reliable for getting real client IP)
        var ipAddress = source.GetServerVariable("HTTP_X_FORWARDED_FOR");
        if (string.IsNullOrEmpty(ipAddress) == false)
        {
            var addresses = ipAddress.Split(',');
            if (addresses.Length != 0)
            {
                // Take the FIRST IP (original client IP), not the last
                return addresses[0].Trim();
            }
        }

        // Fallback to CF-CONNECTING-IP if X-Forwarded-For is not available
        if (!string.IsNullOrEmpty(source.Request.Headers["CF-CONNECTING-IP"]))
        {
            return source.Request.Headers["CF-CONNECTING-IP"]!;
        }

        return source.Connection.RemoteIpAddress!.ToString();
    }
    public static string GetIPAddress(this IHttpContextAccessor accessor)
    {
        return GetIPAddress(accessor.HttpContext!);
    }
}