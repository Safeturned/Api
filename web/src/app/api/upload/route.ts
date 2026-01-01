import { NextRequest, NextResponse } from 'next/server';
import { storeAnalysisResult, storeFile } from '../storage';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FILE_TYPES = ['.dll'];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
                { status: 400 }
            );
        }

        const fileName = file.name.toLowerCase();
        const isValidFileType = ALLOWED_FILE_TYPES.some(ext => fileName.endsWith(ext));
        if (!isValidFileType) {
            return NextResponse.json(
                {
                    error: `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} files are allowed`,
                },
                { status: 400 }
            );
        }

        if (!fileName || fileName.length > 255) {
            return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
        }

        const { data: result } = await serverApiRequest(request, 'files', {
            method: 'POST',
            body: formData,
        });

        const typedResult = result as { fileHash?: string; [key: string]: unknown };
        const analysisId = typedResult.fileHash
            ? typedResult.fileHash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
            : Date.now().toString();

        storeAnalysisResult(analysisId, typedResult);

        const fileArrayBuffer = await file.arrayBuffer();
        storeFile(analysisId, fileArrayBuffer, file.name, file.type);

        return NextResponse.json({
            ...typedResult,
            id: analysisId,
        });
    } catch (error) {
        console.error('Upload error:', error);
        if (error instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Upload failed: ${error.message}` },
                { status: error.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
