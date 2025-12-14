using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Constants;

public enum RateLimitTier
{
    Read = 0,
    Write = 1,
    Expensive = 2,
    FilesUpload = 3,
    Exceptions = 4
}

public static class TierConstants
{
    public static readonly int TierFree = (int)TierType.Free;
    public static readonly int TierVerified = (int)TierType.Verified;
    public static readonly int TierPremium = (int)TierType.Premium;
    public static readonly int TierBot = (int)TierType.Bot;

    public static readonly RateLimitTier[] AllOperationTiers =
    [
        RateLimitTier.Read,
        RateLimitTier.Write,
        RateLimitTier.Expensive,
        RateLimitTier.FilesUpload,
        RateLimitTier.Exceptions
    ];

    public const int RateLimitAdmin = 999999;

    public const int GuestReadLimit = 200;
    public const int GuestWriteLimit = 30;
    public const int GuestExpensiveLimit = 10;

    public const int FreeReadLimit = 2000;
    public const int FreeWriteLimit = 150;
    public const int FreeExpensiveLimit = 30;
    public const int FreeFilesUploadLimit = FreeExpensiveLimit;

    public const int VerifiedReadLimit = 5000;
    public const int VerifiedWriteLimit = 500;
    public const int VerifiedExpensiveLimit = 75;
    public const int VerifiedFilesUploadLimit = VerifiedExpensiveLimit;

    public const int PremiumReadLimit = 15000;
    public const int PremiumWriteLimit = 2000;
    public const int PremiumExpensiveLimit = 200;
    public const int PremiumFilesUploadLimit = PremiumExpensiveLimit;

    public const int BotReadLimit = 50000;
    public const int BotWriteLimit = 20000;
    public const int BotExpensiveLimit = 1000;
    public const int BotFilesUploadLimit = BotExpensiveLimit;

    // Exception reporting limits per hour
    public const int FreeExceptionLimit = 100;
    public const int VerifiedExceptionLimit = 200;
    public const int PremiumExceptionLimit = 500;
    public const int BotExceptionLimit = 1000;

    // File upload limits (same for all tiers due to Cloudflare and chunked upload design)
    public const int MaxChunkSize = 100; // MB - Cloudflare limit per request
    public const int MaxTotalFileSize = 500; // MB - Total file size via chunked upload

    public const int MaxApiKeysFree = 3;
    public const int MaxApiKeysVerified = 5;
    public const int MaxApiKeysPremium = 10;
    public const int MaxApiKeysBot = 10;

    public const int BotBurstLimit = 100;
    public static readonly TimeSpan BotBurstWindow = TimeSpan.FromMinutes(1);

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

    public static int GetOperationRateLimit(TierType tier, RateLimitTier operationTier)
    {
        return (tier, operationTier) switch
        {
            (TierType.Free, RateLimitTier.Read) => FreeReadLimit,
            (TierType.Free, RateLimitTier.Write) => FreeWriteLimit,
            (TierType.Free, RateLimitTier.Expensive) => FreeExpensiveLimit,
            (TierType.Free, RateLimitTier.FilesUpload) => FreeFilesUploadLimit,
            (TierType.Free, RateLimitTier.Exceptions) => FreeExceptionLimit,

            (TierType.Verified, RateLimitTier.Read) => VerifiedReadLimit,
            (TierType.Verified, RateLimitTier.Write) => VerifiedWriteLimit,
            (TierType.Verified, RateLimitTier.Expensive) => VerifiedExpensiveLimit,
            (TierType.Verified, RateLimitTier.FilesUpload) => VerifiedFilesUploadLimit,
            (TierType.Verified, RateLimitTier.Exceptions) => VerifiedExceptionLimit,

            (TierType.Premium, RateLimitTier.Read) => PremiumReadLimit,
            (TierType.Premium, RateLimitTier.Write) => PremiumWriteLimit,
            (TierType.Premium, RateLimitTier.Expensive) => PremiumExpensiveLimit,
            (TierType.Premium, RateLimitTier.FilesUpload) => PremiumFilesUploadLimit,
            (TierType.Premium, RateLimitTier.Exceptions) => PremiumExceptionLimit,

            (TierType.Bot, RateLimitTier.Read) => BotReadLimit,
            (TierType.Bot, RateLimitTier.Write) => BotWriteLimit,
            (TierType.Bot, RateLimitTier.Expensive) => BotExpensiveLimit,
            (TierType.Bot, RateLimitTier.FilesUpload) => BotFilesUploadLimit,
            (TierType.Bot, RateLimitTier.Exceptions) => BotExceptionLimit,

            _ => FreeReadLimit
        };
    }

    public static int GetGuestOperationRateLimit(RateLimitTier operationTier)
    {
        return operationTier switch
        {
            RateLimitTier.Read => GuestReadLimit,
            RateLimitTier.Write => GuestWriteLimit,
            RateLimitTier.Expensive => GuestExpensiveLimit,
            RateLimitTier.FilesUpload => GuestExpensiveLimit,
            RateLimitTier.Exceptions => FreeExceptionLimit,
            _ => GuestReadLimit
        };
    }

    public static int GetExceptionLimit(TierType tier, bool isAdmin)
    {
        if (isAdmin)
        {
            return RateLimitAdmin;
        }

        return tier switch
        {
            TierType.Free => FreeExceptionLimit,
            TierType.Verified => VerifiedExceptionLimit,
            TierType.Premium => PremiumExceptionLimit,
            TierType.Bot => BotExceptionLimit,
            _ => FreeExceptionLimit
        };
    }
}
