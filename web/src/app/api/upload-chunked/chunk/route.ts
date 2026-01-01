import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const sessionId = formData.get('sessionId');
        const chunkIndex = formData.get('chunkIndex');
        const chunk = formData.get('chunk');
        const chunkHash = formData.get('chunkHash');

        if (!sessionId || typeof sessionId !== 'string') {
            return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
        }

        if (chunkIndex === null || isNaN(Number(chunkIndex))) {
            return NextResponse.json({ error: 'Invalid chunkIndex' }, { status: 400 });
        }

        if (!chunk || !(chunk instanceof Blob)) {
            return NextResponse.json({ error: 'Invalid chunk' }, { status: 400 });
        }

        if (!chunkHash || typeof chunkHash !== 'string') {
            return NextResponse.json({ error: 'Invalid chunkHash' }, { status: 400 });
        }

        const { data: result } = await serverApiRequest(request, 'files/upload/chunk', {
            method: 'POST',
            body: formData,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Chunk upload error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Chunk upload failed: ${error.message}` },
                { status: error.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
