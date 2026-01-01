import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'SessionId is required' }, { status: 400 });
        }

        const { data: result } = await serverApiRequest(
            request,
            `files/upload/status/${sessionId}`,
            {
                method: 'GET',
            }
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Status error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Status check failed: ${error.message}` },
                { status: error.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
