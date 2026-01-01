'use client';

import TypewriterEffect from '@/components/TypewriterEffect';

interface LoadingPageProps {
    text?: string;
    speed?: number;
}

export default function LoadingPage({ text = 'common.loading', speed = 150 }: LoadingPageProps) {
    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center'>
            <div className='text-center'>
                <div className='inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                <p className='text-slate-300 text-lg'>
                    <TypewriterEffect text={text} speed={speed} />
                </p>
            </div>
        </div>
    );
}
