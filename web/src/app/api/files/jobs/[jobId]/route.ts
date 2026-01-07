import { NextRequest, NextResponse } from 'next/server';
import { storeAnalysisResult } from '../../../storage';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

interface JobStatusResponse {
    jobId: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'TimedOut';
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    result?: {
        fileHash?: string;
        [key: string]: unknown;
    };
    errorMessage?: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId || typeof jobId !== 'string') {
            return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
        }

        const { data: result } = await serverApiRequest<JobStatusResponse>(
            request,
            `files/jobs/${jobId}`,
            {
                method: 'GET',
                headers: {
                    'api-version': '2.0',
                },
            }
        );

        if (result.status === 'Completed' && result.result) {
            const analysisId = result.result.fileHash
                ? String(result.result.fileHash)
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_')
                      .replace(/=+$/g, '')
                : jobId;

            storeAnalysisResult(analysisId, result.result);

            return NextResponse.json({
                ...result,
                id: analysisId,
                completed: true,
            });
        }

        return NextResponse.json({
            ...result,
            completed: result.status === 'Completed' || result.status === 'Failed',
        });
    } catch (error) {
        console.error('Job status error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json({ error: `Status check failed: ${error.message}` }, { status: error.status });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
