'use client';

import { useAchievements } from '@/lib/achievements-context';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

export default function AchievementsPage() {
    const { achievements } = useAchievements();

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;
    const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-6xl mx-auto px-6 py-12'>
                <div className='mb-8'>
                    <div className='flex items-center gap-3 mb-2'>
                        <Link
                            href='/dashboard'
                            className='text-purple-400 hover:text-purple-300 transition-colors'
                        >
                            <svg
                                className='w-6 h-6'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                                />
                            </svg>
                        </Link>
                        <h1 className='text-4xl font-bold'>🏆 Achievements</h1>
                    </div>
                    <p className='text-slate-400'>Track your milestones and accomplishments</p>
                </div>

                <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8'>
                    <div className='flex items-center justify-between mb-4'>
                        <div>
                            <h2 className='text-2xl font-bold text-white'>
                                {unlockedCount} / {totalCount}
                            </h2>
                            <p className='text-slate-400 text-sm'>Achievements Unlocked</p>
                        </div>
                        <div className='text-4xl'>
                            {completionPercentage === 100
                                ? '🎉'
                                : completionPercentage >= 75
                                  ? '⭐'
                                  : completionPercentage >= 50
                                    ? '🌟'
                                    : completionPercentage >= 25
                                      ? '✨'
                                      : '💫'}
                        </div>
                    </div>
                    <div className='bg-slate-900 rounded-full h-4 overflow-hidden'>
                        <div
                            className='bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-500'
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                    <p className='text-center text-sm text-slate-400 mt-2'>
                        {completionPercentage}% Complete
                    </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {achievements.map(achievement => (
                        <div
                            key={achievement.id}
                            className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 transition-all duration-300 ${
                                achievement.unlocked
                                    ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                    : 'border-slate-700 opacity-60'
                            }`}
                        >
                            <div className='flex items-start gap-4'>
                                <div
                                    className={`text-5xl transition-all duration-300 ${achievement.unlocked ? 'scale-110' : 'grayscale opacity-50'}`}
                                >
                                    {achievement.icon}
                                </div>
                                <div className='flex-1'>
                                    <h3
                                        className={`text-xl font-bold mb-1 ${achievement.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}
                                    >
                                        {achievement.title}
                                    </h3>
                                    <p className='text-sm text-gray-300 mb-3'>
                                        {achievement.description}
                                    </p>

                                    {achievement.maxProgress && (
                                        <div className='mb-2'>
                                            <div className='flex items-center justify-between text-xs text-gray-400 mb-1'>
                                                <span>Progress</span>
                                                <span>
                                                    {achievement.progress || 0} /{' '}
                                                    {achievement.maxProgress}
                                                </span>
                                            </div>
                                            <div className='bg-slate-900 rounded-full h-2 overflow-hidden'>
                                                <div
                                                    className='bg-purple-600 h-full transition-all duration-300'
                                                    style={{
                                                        width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {achievement.unlocked && achievement.unlockedAt && (
                                        <div className='text-xs text-green-400 flex items-center gap-1 mt-2'>
                                            <svg
                                                className='w-4 h-4'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                                />
                                            </svg>
                                            Unlocked{' '}
                                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                                        </div>
                                    )}

                                    {!achievement.unlocked && (
                                        <div className='text-xs text-slate-500 flex items-center gap-1 mt-2'>
                                            <svg
                                                className='w-4 h-4'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                                                />
                                            </svg>
                                            Locked
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {completionPercentage === 100 && (
                    <div className='mt-8 bg-gradient-to-r from-yellow-900/30 to-purple-900/30 border-2 border-yellow-500 rounded-xl p-8 text-center'>
                        <div className='text-6xl mb-4'>🎉🏆🎉</div>
                        <h2 className='text-3xl font-bold text-yellow-400 mb-2'>
                            Achievement Master!
                        </h2>
                        <p className='text-gray-300'>
                            You&apos;ve unlocked all achievements! You&apos;re a true Safeturned
                            champion!
                        </p>
                    </div>
                )}
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
