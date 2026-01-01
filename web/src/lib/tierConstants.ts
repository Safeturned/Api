export const TIER_FREE = 0;
export const TIER_VERIFIED = 1;
export const TIER_PREMIUM = 2;
export const TIER_BOT = 3;

export const TIER_NAMES: Record<number, string> = {
    [TIER_FREE]: 'Free',
    [TIER_VERIFIED]: 'Verified',
    [TIER_PREMIUM]: 'Premium',
    [TIER_BOT]: 'Bot',
};

export const TIER_RATE_LIMITS: Record<number, number> = {
    [TIER_FREE]: 2000,
    [TIER_VERIFIED]: 5000,
    [TIER_PREMIUM]: 15000,
    [TIER_BOT]: 50000,
};

export const TIER_WRITE_LIMITS: Record<number, number> = {
    [TIER_FREE]: 150,
    [TIER_VERIFIED]: 500,
    [TIER_PREMIUM]: 2000,
    [TIER_BOT]: 20000,
};

export const TIER_UPLOAD_LIMITS: Record<number, number> = {
    [TIER_FREE]: 30,
    [TIER_VERIFIED]: 75,
    [TIER_PREMIUM]: 200,
    [TIER_BOT]: 1000,
};

// File upload limits (same for all tiers due to Cloudflare limitations)
// Standard upload: 100 MB max (Cloudflare limit per request)
// Chunked upload: 500 MB max total (multiple 100 MB chunks)
export const MAX_STANDARD_UPLOAD_MB = 100;
export const MAX_CHUNKED_UPLOAD_MB = 500;

// For display purposes (shows chunked upload limit)
export const TIER_FILE_SIZE_LIMITS: Record<number, number> = {
    [TIER_FREE]: MAX_CHUNKED_UPLOAD_MB,
    [TIER_VERIFIED]: MAX_CHUNKED_UPLOAD_MB,
    [TIER_PREMIUM]: MAX_CHUNKED_UPLOAD_MB,
    [TIER_BOT]: MAX_CHUNKED_UPLOAD_MB,
};

export const TIER_API_KEY_LIMITS: Record<number, number> = {
    [TIER_FREE]: 3,
    [TIER_VERIFIED]: 5,
    [TIER_PREMIUM]: 10,
    [TIER_BOT]: 10,
};

export const TIER_TEXT_COLORS: Record<number, string> = {
    [TIER_FREE]: 'text-purple-400',
    [TIER_VERIFIED]: 'text-blue-400',
    [TIER_PREMIUM]: 'text-yellow-400',
    [TIER_BOT]: 'text-green-400',
};

export const TIER_BG_COLORS: Record<number, string> = {
    [TIER_FREE]: 'bg-purple-500/20',
    [TIER_VERIFIED]: 'bg-blue-500/20',
    [TIER_PREMIUM]: 'bg-yellow-500/20',
    [TIER_BOT]: 'bg-green-500/20',
};

export const TIER_BORDER_COLORS: Record<number, string> = {
    [TIER_FREE]: 'border-purple-400',
    [TIER_VERIFIED]: 'border-blue-400',
    [TIER_PREMIUM]: 'border-yellow-400',
    [TIER_BOT]: 'border-green-400',
};

export const TIER_BADGE_COLORS: Record<number, string> = {
    [TIER_FREE]: 'bg-purple-600',
    [TIER_VERIFIED]: 'bg-blue-600',
    [TIER_PREMIUM]: 'bg-yellow-600',
    [TIER_BOT]: 'bg-green-600',
};

export const TIER_TEXT_COLORS_ALT: Record<number, string> = {
    [TIER_FREE]: 'text-slate-400',
    [TIER_VERIFIED]: 'text-blue-400',
    [TIER_PREMIUM]: 'text-purple-400',
};

export const TIER_FEATURES: Record<number, { prioritySupport: boolean }> = {
    [TIER_FREE]: { prioritySupport: false },
    [TIER_VERIFIED]: { prioritySupport: true },
    [TIER_PREMIUM]: { prioritySupport: true },
    [TIER_BOT]: { prioritySupport: true },
};

export const getTierName = (tier: number): string => {
    return TIER_NAMES[tier] || TIER_NAMES[TIER_FREE];
};

export const getTierTextColor = (tier: number): string => {
    return TIER_TEXT_COLORS[tier] || TIER_TEXT_COLORS[TIER_FREE];
};

export const getTierBgColor = (tier: number): string => {
    return TIER_BG_COLORS[tier] || TIER_BG_COLORS[TIER_FREE];
};

export const getTierBorderColor = (tier: number): string => {
    return TIER_BORDER_COLORS[tier] || TIER_BORDER_COLORS[TIER_FREE];
};

export const getTierBadgeColor = (tier: number): string => {
    return TIER_BADGE_COLORS[tier] || TIER_BADGE_COLORS[TIER_FREE];
};

export const getTierTextColorAlt = (tier: number): string => {
    return TIER_TEXT_COLORS_ALT[tier] || TIER_TEXT_COLORS_ALT[TIER_FREE];
};

export const getTierRateLimit = (tier: number): string => {
    const limit = TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS[TIER_FREE];
    if (limit >= 10000) {
        return `${(limit / 1000).toFixed(0)},000`;
    } else if (limit >= 1000) {
        return `${(limit / 1000).toFixed(0)},000`;
    }
    return limit.toString();
};

export const getTierRateLimitNumber = (tier: number): number => {
    return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS[TIER_FREE];
};

export const getTierWriteLimit = (tier: number): number => {
    return TIER_WRITE_LIMITS[tier] || TIER_WRITE_LIMITS[TIER_FREE];
};

export const getTierUploadLimit = (tier: number): number => {
    return TIER_UPLOAD_LIMITS[tier] || TIER_UPLOAD_LIMITS[TIER_FREE];
};

export const getTierFileSizeLimit = (tier: number): number => {
    return TIER_FILE_SIZE_LIMITS[tier] || TIER_FILE_SIZE_LIMITS[TIER_FREE];
};

export const getTierApiKeyLimit = (tier: number): number => {
    return TIER_API_KEY_LIMITS[tier] || TIER_API_KEY_LIMITS[TIER_FREE];
};

export const hasPrioritySupport = (tier: number): boolean => {
    return TIER_FEATURES[tier]?.prioritySupport ?? false;
};
