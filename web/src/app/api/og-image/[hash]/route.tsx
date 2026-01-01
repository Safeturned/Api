import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

const interBold = fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff'
).then(res => res.arrayBuffer());

const interRegular = fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff'
).then(res => res.arrayBuffer());

interface FileData {
    hash: string;
    score: number;
    fileName: string;
    sizeBytes: number;
    detectedType: string;
    lastScanned: string;
}

function getScoreColors(score: number): { primary: string; secondary: string; glow: string } {
    if (score >= 75) return { primary: '#ff4757', secondary: '#ff6b81', glow: '#ff4757' };
    if (score >= 50) return { primary: '#ffa502', secondary: '#ffbe76', glow: '#ffa502' };
    if (score >= 25) return { primary: '#ffd93d', secondary: '#ffe066', glow: '#ffd93d' };
    return { primary: '#2ed573', secondary: '#7bed9f', glow: '#2ed573' };
}

function getRiskLabel(score: number): string {
    if (score >= 75) return 'DANGEROUS';
    if (score >= 50) return 'SUSPICIOUS';
    if (score >= 25) return 'CAUTION';
    return 'SAFE';
}

function truncateFileName(name: string, maxLength: number = 28): string {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const nameWithoutExt = name.slice(0, name.length - ext.length - 1);
    const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 4) + '...';
    return truncatedName + '.' + ext;
}

function convertHashFormats(hash: string): string[] {
    return [
        hash,
        (() => {
            const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
            const padding = (4 - (base64.length % 4)) % 4;
            return base64 + '='.repeat(padding);
        })(),
        hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
    ];
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    const { hash } = await params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.safeturned.com';
    const apiKey = process.env.SAFETURNED_API_KEY;

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };

    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }

    const hashFormats = convertHashFormats(hash);

    for (const hashFormat of hashFormats) {
        try {
            const response = await fetch(`${apiUrl}/v1.0/files/${encodeURIComponent(hashFormat)}`, {
                method: 'GET',
                headers,
                cache: 'no-store',
            });

            if (response.ok) {
                const fileData: FileData = await response.json();
                return await generateSuccessImage(fileData);
            }
        } catch (error) {
            console.error(`Failed to fetch with hash format ${hashFormat}:`, error);
        }
    }

    return await generateErrorImage('File Not Found', 'This scan result does not exist');
}

async function generateSuccessImage(fileData: FileData) {
    const colors = getScoreColors(fileData.score);
    const riskLabel = getRiskLabel(fileData.score);
    const isSafe = fileData.score < 25;

    const [fontBold, fontRegular] = await Promise.all([interBold, interRegular]);

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0d0d0d',
                fontFamily: 'Inter',
                position: 'relative',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    width: 1200,
                    height: 1200,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.glow}25 0%, transparent 60%)`,
                    display: 'flex',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    top: 80,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                }}
            >
                <svg
                    width='64'
                    height='64'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#8b5cf6'
                    strokeWidth='2.5'
                >
                    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                </svg>
                <span style={{ fontSize: 48, fontWeight: 700, color: 'white', display: 'flex' }}>
                    Safeturned
                </span>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 440,
                    height: 440,
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    border: `12px solid ${colors.primary}`,
                    boxShadow: `0 0 120px ${colors.glow}40`,
                    marginBottom: 60,
                }}
            >
                <span
                    style={{
                        fontSize: 160,
                        fontWeight: 800,
                        color: colors.primary,
                        lineHeight: 1,
                        display: 'flex',
                    }}
                >
                    {fileData.score}
                </span>
                <span
                    style={{
                        fontSize: 40,
                        color: '#666',
                        marginTop: 8,
                        display: 'flex',
                    }}
                >
                    / 100
                </span>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    background: `${colors.primary}20`,
                    padding: '24px 56px',
                    borderRadius: 100,
                    marginBottom: 40,
                }}
            >
                <span style={{ fontSize: 56, display: 'flex' }}>
                    {isSafe
                        ? '✅'
                        : fileData.score >= 75
                          ? '🚨'
                          : fileData.score >= 50
                            ? '⚠️'
                            : '⚡'}
                </span>
                <span
                    style={{
                        fontSize: 52,
                        fontWeight: 800,
                        color: colors.primary,
                        letterSpacing: 6,
                        display: 'flex',
                    }}
                >
                    {riskLabel}
                </span>
            </div>

            <div
                style={{
                    fontSize: 64,
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: 16,
                    display: 'flex',
                }}
            >
                {truncateFileName(fileData.fileName)}
            </div>

            <div
                style={{
                    fontSize: 36,
                    color: '#666',
                    display: 'flex',
                }}
            >
                Plugin Security Scan
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 80,
                    fontSize: 32,
                    color: '#8b5cf6',
                    display: 'flex',
                }}
            >
                safeturned.com
            </div>
        </div>,
        {
            width: 2400,
            height: 1260,
            fonts: [
                { name: 'Inter', data: fontBold, weight: 700 },
                { name: 'Inter', data: fontRegular, weight: 400 },
            ],
        }
    );
}

async function generateErrorImage(title: string, subtitle: string) {
    const [fontBold, fontRegular] = await Promise.all([interBold, interRegular]);
    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0d0d0d',
                fontFamily: 'Inter',
                position: 'relative',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    width: 1000,
                    height: 1000,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #8b5cf625 0%, transparent 60%)',
                    display: 'flex',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    top: 80,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                }}
            >
                <svg
                    width='64'
                    height='64'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#8b5cf6'
                    strokeWidth='2.5'
                >
                    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                </svg>
                <span style={{ fontSize: 48, fontWeight: 700, color: 'white', display: 'flex' }}>
                    Safeturned
                </span>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 360,
                    height: 360,
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    border: '12px solid #8b5cf6',
                    boxShadow: '0 0 120px #8b5cf640',
                    marginBottom: 60,
                }}
            >
                <svg
                    width='160'
                    height='160'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#8b5cf6'
                    strokeWidth='2'
                >
                    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                </svg>
            </div>

            <div
                style={{
                    fontSize: 84,
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: 24,
                    display: 'flex',
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: 40,
                    color: '#666',
                    display: 'flex',
                }}
            >
                {subtitle}
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 80,
                    fontSize: 32,
                    color: '#8b5cf6',
                    display: 'flex',
                }}
            >
                safeturned.com
            </div>
        </div>,
        {
            width: 2400,
            height: 1260,
            fonts: [
                { name: 'Inter', data: fontBold, weight: 700 },
                { name: 'Inter', data: fontRegular, weight: 400 },
            ],
        }
    );
}
