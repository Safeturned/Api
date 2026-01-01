import { NextRequest, NextResponse } from 'next/server';
import {
    getAuthHeaders,
    getApiBaseUrl,
    API_VERSION,
    handleApiError,
} from '@/lib/server-auth-helper';

export async function GET(request: NextRequest) {
    try {
        const apiUrl = getApiBaseUrl();
        const { headers, isAuthenticated } = await getAuthHeaders(request);

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(`${apiUrl}/${API_VERSION}/users/me/usage/summary`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            return handleApiError(response);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('API proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
