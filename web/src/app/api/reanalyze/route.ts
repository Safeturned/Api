import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisResult, storeAnalysisResult, getStoredFile } from '../storage';
import { serverApiRequest, ServerApiError } from '@/lib/api-client-server';

export async function POST(request: NextRequest) {
    try {
        const { fileHash } = await request.json();

        if (!fileHash) {
            return NextResponse.json({ error: 'File hash is required' }, { status: 400 });
        }

        let existingResult = getAnalysisResult(fileHash);

        if (!existingResult) {
            const originalHash = fileHash.replace(/-/g, '+').replace(/_/g, '/');
            existingResult = getAnalysisResult(originalHash);
        }

        if (!existingResult) {
            const urlSafeHash = fileHash
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
            existingResult = getAnalysisResult(urlSafeHash);
        }

        if (!existingResult) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }

        let storedFile = getStoredFile(fileHash);

        if (!storedFile) {
            const originalHash = fileHash.replace(/-/g, '+').replace(/_/g, '/');
            storedFile = getStoredFile(originalHash);
        }

        if (!storedFile) {
            const urlSafeHash = fileHash
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
            storedFile = getStoredFile(urlSafeHash);
        }

        if (!storedFile) {
            return NextResponse.json(
                {
                    error: 'FILE_NOT_STORED',
                    message:
                        'This file is not available for reanalysis. To scan this file again with the latest security checks, please upload it again.',
                    details:
                        'Files are only stored temporarily for website uploads. Files uploaded via API are not stored for reanalysis.',
                },
                { status: 400 }
            );
        }

        const formData = new FormData();
        formData.append('forceAnalyze', 'true');
        const fileBlob = new Blob([storedFile.fileData], { type: storedFile.mimeType });
        const recreatedFile = new File([fileBlob], storedFile.fileName, {
            type: storedFile.mimeType,
        });
        formData.append('file', recreatedFile);

        const { data: result } = await serverApiRequest(request, 'files', {
            method: 'POST',
            body: formData,
            searchParams: { forceAnalyze: 'true' },
        });

        const hashToUse = existingResult.id || fileHash;
        storeAnalysisResult(hashToUse, result as Record<string, unknown>);
        return NextResponse.json(result);
    } catch (err) {
        console.error('Reanalysis error:', err);
        if (err instanceof ServerApiError) {
            return NextResponse.json(
                { error: `Reanalysis failed: ${err.message}` },
                { status: err.status }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
