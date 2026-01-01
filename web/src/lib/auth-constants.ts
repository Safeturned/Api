export const AUTH_COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    OAUTH: 'safeturned_oauth',
} as const;

export const AUTH_HEADERS = {
    AUTHORIZATION: 'Authorization',
    API_KEY: 'X-API-Key',
} as const;

export const AUTH_STORAGE_KEYS = {
    USER: 'safeturned_user',
} as const;

export const AUTH_EVENTS = {
    SESSION_INVALID: 'auth:session-invalid',
} as const;
