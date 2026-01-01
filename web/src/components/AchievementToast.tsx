'use client';

import { useEffect } from 'react';
import { useAchievements } from '@/lib/achievements-context';
import { useTranslation } from '@/hooks/useTranslation';

export default function AchievementToast() {
    const { showAchievementToast, dismissToast } = useAchievements();
    const { t } = useTranslation();

    useEffect(() => {
        if (showAchievementToast) {
            const timer = setTimeout(() => {
                dismissToast();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [showAchievementToast, dismissToast]);

    if (!showAchievementToast) return null;

    return (
        <div className='fixed bottom-8 right-8 z-50 animate-slideInUp'>
            <div className='bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-yellow-400 rounded-xl p-6 shadow-2xl shadow-yellow-500/20 max-w-sm'>
                <div className='flex items-start gap-4'>
                    <div className='text-5xl'>{showAchievementToast.icon}</div>
                    <div className='flex-1'>
                        <div className='text-yellow-400 font-bold text-sm mb-1'>
                            {t('achievements.unlocked')}
                        </div>
                        <h3 className='text-white font-bold text-lg mb-1'>
                            {showAchievementToast.title}
                        </h3>
                        <p className='text-gray-300 text-sm'>{showAchievementToast.description}</p>
                    </div>
                    <button
                        onClick={dismissToast}
                        className='text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-purple-900 rounded p-1'
                        aria-label='Dismiss achievement notification'
                    >
                        <svg
                            className='w-5 h-5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M6 18L18 6M6 6l12 12'
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
