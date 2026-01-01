import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.fileName || typeof body.fileName !== 'string') {
            return NextResponse.json({ error: 'Invalid fileName' }, { status: 400 });
        }

        if (
            !body.fileSizeBytes ||
            typeof body.fileSizeBytes !== 'number' ||
            body.fileSizeBytes <= 0
        ) {
            return NextResponse.json({ error: 'Invalid fileSizeBytes' }, { status: 400 });
        }

        if (!body.fileHash || typeof body.fileHash !== 'string') {
            return NextResponse.json({ error: 'Invalid fileHash' }, { status: 400 });
        }

        if (!body.totalChunks || typeof body.totalChunks !== 'number' || body.totalChunks <= 0) {
            return NextResponse.json({ error: 'Invalid totalChunks' }, { status: 400 });
        }

        const { data: result } = await serverApiRequest(request, 'files/upload/initiate', {
            method: 'POST',
            body,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Initiate error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Initiate failed: ${error.message}` },
                { status: error.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
