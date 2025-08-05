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
        if (!string.IsNullOrEmpty(source.Request.Headers["CF-CONNECTING-IP"]))
        {
            return source.Request.Headers["CF-CONNECTING-IP"]!;
        }

        var ipAddress = source.GetServerVariable("HTTP_X_FORWARDED_FOR");
        if (string.IsNullOrEmpty(ipAddress) == false)
        {
            var addresses = ipAddress.Split(',');
            if (addresses.Length != 0)
            {
                return addresses.Last();
            }
        }

        return source.Connection.RemoteIpAddress!.ToString();
    }
    public static string GetIPAddress(this IHttpContextAccessor accessor)
    {
        return GetIPAddress(accessor.HttpContext!);
    }
}