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

        const response = await fetch(`${apiUrl}/${API_VERSION}/badges`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            return handleApiError(response, 'Failed to fetch badges');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching badges:', error);
        return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const apiUrl = getApiBaseUrl();
        const { headers, isAuthenticated } = await getAuthHeaders(request);

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${apiUrl}/${API_VERSION}/badges`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return handleApiError(response, 'Failed to create badge');
        }

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error creating badge:', error);
        return NextResponse.json({ error: 'Failed to create badge' }, { status: 500 });
    }
}
