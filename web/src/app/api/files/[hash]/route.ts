import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisResult, storeAnalysisResult } from '../../storage';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
    try {
        const { hash } = await params;

        if (!hash || typeof hash !== 'string' || hash.length < 10) {
            return NextResponse.json({ error: 'Invalid hash parameter' }, { status: 400 });
        }

        const result = getAnalysisResult(hash);

        if (result) {
            return NextResponse.json(result);
        }

        try {
            const hashFormats = [
                hash,
                // Convert URL-safe to base64 with padding restoration
                (() => {
                    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
                    const padding = (4 - (base64.length % 4)) % 4;
                    return base64 + '='.repeat(padding);
                })(),
                // Keep URL-safe format without padding
                hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
            ];

            for (const hashFormat of hashFormats) {
                try {
                    const { data: upstreamResult } = await serverApiRequest(
                        request,
                        `files/${hashFormat}`,
                        {
                            method: 'GET',
                        }
                    );

                    storeAnalysisResult(hash, upstreamResult as Record<string, unknown>);
                    return NextResponse.json(upstreamResult);
                } catch (error) {
                    if (error instanceof ServerApiError && error.status === 404) {
                        continue;
                    }
                    throw error;
                }
            }
        } catch (upstreamError) {
            console.error('Error fetching from API:', upstreamError);
        }

        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    } catch (error) {
        console.error('Internal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
