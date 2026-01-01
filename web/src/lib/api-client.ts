import { AUTH_HEADERS, AUTH_STORAGE_KEYS, AUTH_EVENTS } from './auth-constants';
import { API_VERSION } from './apiConfig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function getApiUrl(endpoint: string): string {
    if (endpoint.startsWith('/api/')) {
        return endpoint;
    }

    if (!API_BASE_URL) {
        throw new Error(
            'NEXT_PUBLIC_API_URL environment variable is required in production. Please set it in your .env file.'
        );
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${API_VERSION}/${cleanEndpoint}`;
}

export function getApiBaseUrl(): string {
    return API_BASE_URL;
}

function getDefaultHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers[AUTH_HEADERS.API_KEY] = token;
    }

    return headers;
}

function mergeHeaders(target: Record<string, string>, source: HeadersInit): void {
    if (source instanceof Headers) {
        source.forEach((value, key) => {
            target[key] = value;
        });
    } else if (Array.isArray(source)) {
        source.forEach(([key, value]) => {
            target[key] = value;
        });
    } else {
        Object.assign(target, source);
    }
}

export async function apiRequest<T = unknown>(
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        body?: unknown;
        token?: string;
        headers?: HeadersInit;
        signal?: AbortSignal;
    } = {}
): Promise<T> {
    const { method = 'GET', body, token, headers: customHeaders = {}, signal } = options;

    const url = getApiUrl(endpoint);
    const headers: Record<string, string> = {};

    mergeHeaders(headers, getDefaultHeaders(token));
    mergeHeaders(headers, customHeaders);

    if (body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'include',
        signal,
    };

    if (body) {
        if (body instanceof FormData) {
            fetchOptions.body = body;
        } else {
            fetchOptions.body = JSON.stringify(body);
        }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        let errorData: { error?: string; [key: string]: unknown };

        try {
            const errorText = await response.text();
            if (errorText) {
                try {
                    errorData = JSON.parse(errorText) as { error?: string; [key: string]: unknown };
                } catch {
                    errorData = { error: errorText };
                }
            } else {
                errorData = { error: `Request failed: ${response.status}` };
            }
        } catch {
            errorData = { error: `Request failed: ${response.status}` };
        }

        if (response.status === 401) {
            const isAuthEndpoint = endpoint.startsWith('auth/') || endpoint.includes('/auth/');

            if (isAuthEndpoint && typeof window !== 'undefined') {
                localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
                window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_INVALID));
            }
        }

        const errorMessage =
            errorData.error ||
            (errorData.message as string) ||
            `Request failed: ${response.status}`;
        throw new ApiError(errorMessage, response.status, errorData);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }

    return null as T;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: { error?: string; [key: string]: unknown }
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const api = {
    get: <T = unknown>(endpoint: string, options?: { token?: string; signal?: AbortSignal }) =>
        apiRequest<T>(endpoint, { method: 'GET', ...options }),

    post: <T = unknown>(
        endpoint: string,
        body?: unknown,
        options?: { token?: string; headers?: HeadersInit; signal?: AbortSignal }
    ) => apiRequest<T>(endpoint, { method: 'POST', body, ...options }),

    put: <T = unknown>(
        endpoint: string,
        body?: unknown,
        options?: { token?: string; headers?: HeadersInit; signal?: AbortSignal }
    ) => apiRequest<T>(endpoint, { method: 'PUT', body, ...options }),

    delete: <T = unknown>(endpoint: string, options?: { token?: string; signal?: AbortSignal }) =>
        apiRequest<T>(endpoint, { method: 'DELETE', ...options }),

    patch: <T = unknown>(
        endpoint: string,
        body?: unknown,
        options?: { token?: string; headers?: HeadersInit; signal?: AbortSignal }
    ) => apiRequest<T>(endpoint, { method: 'PATCH', body, ...options }),
};
