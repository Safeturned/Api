import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

interface AnalysisResult {
    fileHash?: string;
    jobId?: string;
    pollUrl?: string;
    message?: string;
    [key: string]: unknown;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.sessionId || typeof body.sessionId !== 'string') {
            return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
        }

        const { data: result, status } = await serverApiRequest<AnalysisResult>(
            request,
            'files/upload/complete',
            {
                method: 'POST',
                body,
            }
        );

        if (status === 202 && result.jobId) {
            return NextResponse.json(
                {
                    pending: true,
                    jobId: result.jobId,
                    message: result.message || 'Analysis in progress',
                },
                { status: 202 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Complete error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Complete failed: ${error.message}` },
                { status: error.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
