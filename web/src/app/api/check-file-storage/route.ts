import { NextRequest, NextResponse } from 'next/server';
import { getStoredFile } from '../storage';

export async function POST(request: NextRequest) {
    try {
        const { fileHash } = await request.json();

        if (!fileHash) {
            return NextResponse.json({ error: 'File hash is required' }, { status: 400 });
        }

        const storedFile = getStoredFile(fileHash);

        if (!storedFile) {
            const urlSafeHash = fileHash
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
            const storedFileUrlSafe = getStoredFile(urlSafeHash);

            if (storedFileUrlSafe) {
                return NextResponse.json({ isStored: true });
            }

            return NextResponse.json({ isStored: false });
        }

        return NextResponse.json({ isStored: true });
    } catch (error) {
        console.error('Error checking file storage:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
