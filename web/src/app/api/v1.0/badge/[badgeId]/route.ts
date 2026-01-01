import { NextRequest, NextResponse } from 'next/server';
import { makeBadge } from 'badge-maker';
import { getApiBaseUrl, API_VERSION } from '@/lib/server-auth-helper';

interface Badge {
    id: string;
    name: string;
    description: string | null;
    linkedFileHash: string;
    createdAt: string;
    updatedAt: string;
    requireTokenForUpdate: boolean;
    versionUpdateCount: number;
}

interface FileData {
    hash: string;
    score: number;
    fileName: string;
    sizeBytes: number;
    detectedType: string;
    addDateTime: string;
    lastScanned: string;
    timesScanned: number;
}

function getScoreColor(score: number): string {
    if (score >= 75) return 'red';
    if (score >= 50) return 'orange';
    if (score >= 25) return 'yellow';
    return 'brightgreen';
}

function getScoreLabel(score: number): string {
    if (score >= 75) return 'High Risk';
    if (score >= 50) return 'Moderate Risk';
    if (score >= 25) return 'Low Risk';
    return 'Safe';
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ badgeId: string }> }
) {
    try {
        const apiUrl = getApiBaseUrl();
        const { badgeId } = await params;

        const apiKey = process.env.SAFETURNED_API_KEY;
        const headers: Record<string, string> = {
            Accept: 'application/json',
        };

        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }

        const badgeResponse = await fetch(`${apiUrl}/${API_VERSION}/badges/${badgeId}`, {
            method: 'GET',
            headers,
        });

        if (!badgeResponse.ok) {
            const errorBadge = makeBadge({
                label: 'Safeturned',
                message: 'Badge Not Found',
                color: 'lightgrey',
                style: 'flat',
            });
            return new NextResponse(errorBadge, {
                status: 200,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        const badge: Badge & { linkedFile?: FileData } = await badgeResponse.json();

        if (!badge.linkedFile) {
            const errorBadge = makeBadge({
                label: badge.name || 'Safeturned',
                message: 'File Not Found',
                color: 'lightgrey',
                style: 'flat',
            });
            return new NextResponse(errorBadge, {
                status: 200,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        }

        const fileData = badge.linkedFile;

        const shieldIcon =
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==';

        const badgeSvg = makeBadge({
            label: badge.name || 'Safeturned',
            message: `${getScoreLabel(fileData.score)} (${fileData.score}/100)`,
            color: getScoreColor(fileData.score),
            style: 'flat',
            logoBase64: shieldIcon,
        });

        return new NextResponse(badgeSvg, {
            status: 200,
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=300',
                'X-Badge-Version': badge.versionUpdateCount.toString(),
                'X-Last-Updated': badge.updatedAt,
            },
        });
    } catch (error) {
        console.error('Error generating badge:', error);

        const errorBadge = makeBadge({
            label: 'Safeturned',
            message: 'Error',
            color: 'lightgrey',
            style: 'flat',
        });

        return new NextResponse(errorBadge, {
            status: 200,
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=60',
            },
        });
    }
}
