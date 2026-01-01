'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { throttle } from '@/lib/utils';

export default function BackToTop() {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = useMemo(
        () =>
            throttle(() => {
                setIsVisible(window.scrollY > 300);
            }, 100),
        []
    );

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, [toggleVisibility]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className='fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-3 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 active:scale-95 z-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                    aria-label={t('nav.backToTop')}
                    title={t('nav.backToTop')}
                >
                    <svg
                        className='w-6 h-6'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 10l7-7m0 0l7 7m-7-7v18'
                        />
                    </svg>
                </button>
            )}
        </>
    );
}
