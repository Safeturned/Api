using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Constants;

public static class TierConstants
{
    public const int TierFree = 0;
    public const int TierVerified = 1;
    public const int TierPremium = 2;
    public const int TierBot = 3;

    public const int RateLimitFree = 60;
    public const int RateLimitVerified = 300;
    public const int RateLimitPremium = 1000;
    public const int RateLimitBot = 10000;

    public const int FileSizeLimitFree = 100;
    public const int FileSizeLimitVerified = 200;
    public const int FileSizeLimitPremium = 500;
    public const int FileSizeLimitBot = 500;

    public const int MaxApiKeysFree = 3;
    public const int MaxApiKeysVerified = 5;
    public const int MaxApiKeysPremium = 10;
    public const int MaxApiKeysBot = 10;

    public const int BotBurstLimit = 100;
    public static readonly TimeSpan BotBurstWindow = TimeSpan.FromMinutes(1);

    public static int GetRateLimit(TierType tier)
    {
        return tier switch
        {
            TierType.Free => RateLimitFree,
            TierType.Verified => RateLimitVerified,
            TierType.Premium => RateLimitPremium,
            TierType.Bot => RateLimitBot,
            _ => RateLimitFree
        };
    }

    public static int GetFileSizeLimit(TierType tier)
    {
        return tier switch
        {
            TierType.Free => FileSizeLimitFree,
            TierType.Verified => FileSizeLimitVerified,
            TierType.Premium => FileSizeLimitPremium,
            TierType.Bot => FileSizeLimitBot,
            _ => FileSizeLimitFree
        };
    }

    public static int GetMaxApiKeys(TierType tier)
    {
        return tier switch
        {
            TierType.Free => MaxApiKeysFree,
            TierType.Verified => MaxApiKeysVerified,
            TierType.Premium => MaxApiKeysPremium,
            TierType.Bot => MaxApiKeysBot,
            _ => MaxApiKeysFree
        };
    }

    public static bool HasPrioritySupport(TierType tier)
    {
        return tier != TierType.Free;
    }
}
