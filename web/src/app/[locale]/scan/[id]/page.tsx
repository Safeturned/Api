'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

interface RecentScan {
    id: string;
    fileName: string;
    fileHash: string;
    score: number;
    isThreat: boolean;
    scanDate: string;
}

export default function ScanResultPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    useEffect(() => {
        const redirectToHashResult = async () => {
            try {
                const scans = await api.get<RecentScan[]>('users/me/scans/recent?limit=100');
                const scan = scans.find(s => s.id === id);

                if (scan?.fileHash) {
                    router.push(`/result/${scan.fileHash}`);
                } else {
                    router.push('/');
                }
            } catch (error) {
                console.error('Failed to fetch scan:', error);
                router.push('/');
            }
        };

        if (id) {
            redirectToHashResult();
        }
    }, [id, router]);

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center'>
            <div className='text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4'></div>
                <p className='text-slate-300'>Loading scan details...</p>
            </div>
        </div>
    );
}
