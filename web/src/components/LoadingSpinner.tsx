'use client';

import TypewriterEffect from '@/components/TypewriterEffect';

interface LoadingSpinnerProps {
    text?: string;
    speed?: number;
}

export default function LoadingSpinner({
    text = 'common.loading',
    speed = 150,
}: LoadingSpinnerProps) {
    return (
        <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
                <div className='inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                <p className='text-slate-300 text-lg'>
                    <TypewriterEffect text={text} speed={speed} />
                </p>
            </div>
        </div>
    );
}
