import { Metadata } from 'next';
import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = false;

interface FileData {
    hash: string;
    score: number;
    fileName: string;
    fileSizeBytes: number;
    lastScanned: string;
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

async function getFileData(hash: string): Promise<FileData | null> {
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
                next: { revalidate: 60 },
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(`Failed to fetch with hash format ${hashFormat}:`, error);
        }
    }

    return null;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ hash: string; locale: string }>;
}): Promise<Metadata> {
    const { hash, locale } = await params;
    const fileData = await getFileData(hash);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://safeturned.com';
    const ogImageUrl = `${baseUrl}/api/og-image/${hash}`;
    const pageUrl = `${baseUrl}/${locale}/result/${hash}`;

    if (!fileData) {
        return {
            title: 'Scan Result Not Found - Safeturned',
            description: 'This scan result does not exist or has been removed.',
            openGraph: {
                title: 'Scan Result Not Found - Safeturned',
                description: 'This scan result does not exist or has been removed.',
                url: pageUrl,
                siteName: 'Safeturned',
                images: [
                    {
                        url: ogImageUrl,
                        width: 1200,
                        height: 630,
                        alt: 'Safeturned - File Not Found',
                    },
                ],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: 'Scan Result Not Found - Safeturned',
                description: 'This scan result does not exist or has been removed.',
                images: [ogImageUrl],
            },
        };
    }

    let metaTitle: string;
    let metaDescription: string;

    if (fileData.score >= 80) {
        metaTitle = `HIGH RISK: ${fileData.fileName} - Safeturned Scan`;
        metaDescription = `HIGH RISK - "${fileData.fileName}" scored ${fileData.score}/100 in security analysis. Signs of malicious behavior detected. Do not use this file.`;
    } else if (fileData.score >= 60) {
        metaTitle = `SUSPICIOUS: ${fileData.fileName} - Safeturned Scan`;
        metaDescription = `SUSPICIOUS - "${fileData.fileName}" scored ${fileData.score}/100. Potentially unsafe behavior detected. Use with extreme caution.`;
    } else if (fileData.score >= 30) {
        metaTitle = `Minor Concerns: ${fileData.fileName} - Safeturned Scan`;
        metaDescription = `Minor concerns found in "${fileData.fileName}" (${fileData.score}/100). Review recommended before using this file.`;
    } else {
        metaTitle = `CLEAN: ${fileData.fileName} - Safeturned Scan`;
        metaDescription = `CLEAN - "${fileData.fileName}" passed security scan (${fileData.score}/100). No malicious behavior detected. Safe to use.`;
    }

    return {
        title: metaTitle,
        description: metaDescription,
        openGraph: {
            title: metaTitle,
            description: metaDescription,
            url: pageUrl,
            siteName: 'Safeturned',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: `Safeturned scan result for ${fileData.fileName}`,
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: metaTitle,
            description: metaDescription,
            images: [ogImageUrl],
        },
    };
}

export default function ResultHashLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
