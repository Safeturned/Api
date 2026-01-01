import { NextResponse } from 'next/server';
import { API_VERSION } from '@/lib/server-auth-helper';

const FALLBACK_DATA = {
    totalFilesScanned: 0,
    totalThreatsDetected: 0,
    averageScanTimeMs: 0,
    lastUpdated: new Date().toISOString(),
    totalSafeFiles: 0,
    averageScore: 0,
    firstScanDate: new Date().toISOString(),
    lastScanDate: new Date().toISOString(),
    totalScanTimeMs: 0,
    threatDetectionRate: 0,
};

export async function GET() {
    try {
        const apiKey = process.env.SAFETURNED_API_KEY;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiKey) {
            console.warn(
                'SAFETURNED_API_KEY environment variable is not set, returning fallback data'
            );
            return NextResponse.json(FALLBACK_DATA);
        }

        if (!apiUrl) {
            console.warn(
                'NEXT_PUBLIC_API_URL environment variable is not set, returning fallback data'
            );
            return NextResponse.json(FALLBACK_DATA);
        }

        const response = await fetch(`${apiUrl}/${API_VERSION}/files/analytics`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
        });

        if (!response.ok) {
            console.warn(
                `Analytics API responded with status: ${response.status}, returning fallback data`
            );
            return NextResponse.json(FALLBACK_DATA);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.warn('Error fetching analytics, returning fallback data:', error);
        return NextResponse.json(FALLBACK_DATA);
    }
}
