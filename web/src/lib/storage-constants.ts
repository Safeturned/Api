export const STORAGE_KEYS = {
    ACHIEVEMENTS: 'safeturned_achievements',
    BADGES_ABOUT_DISMISSED: 'badges-about-dismissed',
    NOTIFICATIONS_INFO_CLOSED: 'notifications-info-box-closed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
