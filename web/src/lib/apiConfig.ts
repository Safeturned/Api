export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.safeturned.com';
export const API_VERSION = 'v1.0';

export const getApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint}`;
};

export const API_ENDPOINTS = {
    FILES: `/${API_VERSION}/files`,
    FILES_BY_HASH: (hash: string) => `/${API_VERSION}/files/${hash}`,
    FILES_BY_FILENAME: (filename: string) => `/${API_VERSION}/files/filename/${filename}`,
    FILES_ANALYTICS: `/${API_VERSION}/files/analytics`,

    AUTH_DISCORD: `/${API_VERSION}/auth/discord`,
    AUTH_LOGOUT: `/${API_VERSION}/auth/logout`,
    AUTH_REFRESH: `/${API_VERSION}/auth/refresh`,

    USER_API_KEYS: `/${API_VERSION}/users/me/api-keys`,
    USER_ME: `/${API_VERSION}/users/me`,

    ADMIN_ANALYTICS: `/${API_VERSION}/admin/analytics`,
    ADMIN_USERS: `/${API_VERSION}/admin/users`,
} as const;

export const getFullApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint}`;
};
