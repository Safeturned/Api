import { serverApiRequest } from '@/lib/api-client-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { data } = await serverApiRequest(request, 'files/version', {
            method: 'GET',
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch analyzer version:', error);
        return NextResponse.json({ version: null }, { status: 500 });
    }
}
