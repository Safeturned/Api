using System.Text.RegularExpressions;

namespace Safeturned.Api.Filters;

/// <summary>
/// Sentry request filter to remove sensitive file upload data before sending events.
/// This is needed because our file upload endpoint going to contain user plugins, DLLs,
/// or other confidential content that should never be stored in Sentry logs or anywhere else.
/// </summary>
public partial class SentryRequestFilter
{
    private static readonly Regex UploadEndpointRegex = MyRegex();

    public SentryEvent? Filter(SentryEvent sentryEvent)
    {
        try
        {
            var req = sentryEvent.Request;
            if (req == null)
                return sentryEvent;
            var method = req.Method?.Trim().ToUpperInvariant();
            var url = req.Url?.Trim().ToLowerInvariant();
            if (method == HttpMethods.Post && url != null && UploadEndpointRegex.IsMatch(url))
            {
                if (req.Headers?.TryGetValue("Content-Type", out var contentType) == true && contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                {
                    req.Data = "[Filtered: file upload]";
                }
            }
        }
        catch
        {
            // Fail-safe: never block events due to filter errors
            return sentryEvent;
        }
        return sentryEvent;
    }

    [GeneratedRegex(@"/v\d+(\.\d+)?/files$", RegexOptions.IgnoreCase | RegexOptions.Compiled, "en-US")]
    private static partial Regex MyRegex();
}