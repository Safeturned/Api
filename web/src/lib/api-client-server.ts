import { NextRequest } from 'next/server';
import { API_VERSION } from './apiConfig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getApiUrl(endpoint: string): string {
    if (!API_BASE_URL) {
        throw new Error(
            'NEXT_PUBLIC_API_URL environment variable is required in production. Please set it in your .env file.'
        );
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${API_VERSION}/${cleanEndpoint}`;
}

function buildServerHeaders(
    request: NextRequest,
    options: {
        token?: string;
        customHeaders?: Record<string, string>;
    } = {}
): Record<string, string> {
    const headers: Record<string, string> = {};

    const authHeader = request.headers.get('authorization');
    const hasUserAuth = authHeader && authHeader.startsWith('Bearer ');

    if (hasUserAuth) {
        headers['Authorization'] = authHeader;
    } else if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
    } else {
        const apiKey = process.env.SAFETURNED_API_KEY;
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (origin) {
        headers['Origin'] = origin;
    }
    if (referer) {
        headers['Referer'] = referer;
    }

    const existingForwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');

    if (realIP) {
        const newForwardedFor = existingForwardedFor
            ? `${existingForwardedFor}, ${realIP}`
            : realIP;
        headers['X-Forwarded-For'] = newForwardedFor;
    } else if (existingForwardedFor) {
        headers['X-Forwarded-For'] = existingForwardedFor;
    }

    if (options.customHeaders) {
        Object.assign(headers, options.customHeaders);
    }

    return headers;
}

export async function serverApiRequest<T = unknown>(
    request: NextRequest,
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        body?: unknown;
        token?: string;
        headers?: Record<string, string>;
        searchParams?: Record<string, string>;
    } = {}
): Promise<{ data: T; status: number }> {
    const { method = 'GET', body, token, headers: customHeaders = {}, searchParams } = options;

    const url = new URL(getApiUrl(endpoint));

    if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const headers = buildServerHeaders(request, { token, customHeaders });

    if (body && !(body instanceof FormData)) {
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
    };

    if (body) {
        if (body instanceof FormData) {
            fetchOptions.body = body;
        } else {
            fetchOptions.body = JSON.stringify(body);
        }
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: string; [key: string]: unknown };
        try {
            errorData = JSON.parse(errorText) as { error?: string; [key: string]: unknown };
        } catch {
            errorData = { error: errorText || `Request failed: ${response.status}` };
        }

        throw new ServerApiError(
            errorData.error || `Request failed: ${response.status}`,
            response.status,
            errorData
        );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return { data, status: response.status };
    }

    return { data: null as T, status: response.status };
}

export class ServerApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: { error?: string; [key: string]: unknown }
    ) {
        super(message);
        this.name = 'ServerApiError';
    }
}
