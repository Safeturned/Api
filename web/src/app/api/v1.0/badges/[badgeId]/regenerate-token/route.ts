import { NextRequest, NextResponse } from 'next/server';
import {
    getAuthHeaders,
    getApiBaseUrl,
    API_VERSION,
    handleApiError,
} from '@/lib/server-auth-helper';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ badgeId: string }> }
) {
    try {
        const apiUrl = getApiBaseUrl();
        const { headers, isAuthenticated } = await getAuthHeaders(request);

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { badgeId } = await params;

        const response = await fetch(
            `${apiUrl}/${API_VERSION}/badges/${badgeId}/regenerate-token`,
            {
                method: 'POST',
                headers,
            }
        );

        if (!response.ok) {
            return handleApiError(response, 'Failed to regenerate token');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error regenerating token:', error);
        return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 });
    }
}
