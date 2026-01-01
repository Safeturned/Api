import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAMES, AUTH_HEADERS } from './auth-constants';
export { API_VERSION } from './apiConfig';

export interface AuthHeaders {
    headers: Record<string, string>;
    isAuthenticated: boolean;
}

export async function handleApiError(
    response: Response,
    fallbackMessage?: string
): Promise<NextResponse> {
    const errorText = await response.text();
    console.error('API request failed:', response.status, errorText);

    try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
    } catch {
        return NextResponse.json(
            { error: errorText || fallbackMessage || `Request failed: ${response.status}` },
            { status: response.status }
        );
    }
}

export function getApiBaseUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
    }

    return apiUrl;
}

export async function getAuthHeaders(request: NextRequest): Promise<AuthHeaders> {
    const authHeader = request.headers.get(AUTH_HEADERS.AUTHORIZATION);
    const hasBearerToken = authHeader && authHeader.startsWith('Bearer ');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (hasBearerToken) {
        headers[AUTH_HEADERS.AUTHORIZATION] = authHeader;
        return { headers, isAuthenticated: true };
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN);

    if (!authToken) {
        return { headers, isAuthenticated: false };
    }

    headers['Cookie'] = `${AUTH_COOKIE_NAMES.ACCESS_TOKEN}=${authToken.value}`;
    return { headers, isAuthenticated: true };
}
