namespace Safeturned.Api.RateLimiting;

public static class KnownRateLimitPolicies
{
    public const string UploadFile = "upload-file";
    public const string AnalyticsWithDateRange = "analytics-with-date-range";
    public const string ChunkedUpload = "chunked-upload";
}