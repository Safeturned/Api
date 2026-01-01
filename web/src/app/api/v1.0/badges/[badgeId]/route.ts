import { NextRequest, NextResponse } from 'next/server';
import {
    getAuthHeaders,
    getApiBaseUrl,
    API_VERSION,
    handleApiError,
} from '@/lib/server-auth-helper';

export async function DELETE(
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

        const response = await fetch(`${apiUrl}/${API_VERSION}/badges/${badgeId}`, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok) {
            return handleApiError(response, 'Failed to delete badge');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error deleting badge:', error);
        return NextResponse.json({ error: 'Failed to delete badge' }, { status: 500 });
    }
}
