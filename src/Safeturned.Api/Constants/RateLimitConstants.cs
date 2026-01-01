namespace Safeturned.Api.Constants;

public static class RateLimitConstants
{
    public const string CacheKeyPrefix = "ratelimit";
    public const string CacheKeyBurstPrefix = "ratelimit:burst";
    public const string CacheKeyUserFormat = "ratelimit:{0}:user:{1}";
    public const string CacheKeyGuestFormat = "ratelimit:{0}:guest:{1}";

    public const string AuthFailCacheKeyPrefix = "auth_fail";
    public const string AuthFailCacheKeyFormat = "auth_fail:{0}";

    public const int NearLimitThresholdPercent = 80;
    public const int PercentageMultiplier = 100;
    public const int DecimalPlacesForRounding = 2;
}
