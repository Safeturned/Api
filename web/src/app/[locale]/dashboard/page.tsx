'use client';

import { useAuth } from '@/lib/auth-context';
import {
    getTierName,
    getTierTextColorAlt,
    getTierRateLimitNumber,
    getTierWriteLimit,
    getTierUploadLimit,
    getTierFileSizeLimit,
    hasPrioritySupport,
    TIER_FREE,
} from '@/lib/tierConstants';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import RateLimitUsage from '@/components/RateLimitUsage';
import LoadingPage from '@/components/LoadingPage';
import { api } from '@/lib/api-client';
import { encodeHashForUrl } from '@/lib/utils';

interface ScanStats {
    totalScans: number;
    threatsDetected: number;
    cleanFiles: number;
    averageScore: number;
    averageScanTime: number;
}

interface RecentScan {
    id: string;
    fileName: string;
    score: number;
    isThreat: boolean;
    scanDate: string;
    fileHash?: string;
}

export default function DashboardPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [scanStats, setScanStats] = useState<ScanStats | null>(null);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setError(null);
            const [statsResult, recentsResult] = await Promise.allSettled([
                api.get<ScanStats>('users/me/scans/stats'),
                api.get<RecentScan[]>('users/me/scans/recent?limit=3'),
            ]);

            if (statsResult.status === 'fulfilled') {
                setScanStats(statsResult.value);
            } else {
                console.error('Failed to fetch stats:', statsResult.reason);
            }

            if (recentsResult.status === 'fulfilled') {
                setRecentScans(recentsResult.value);
            } else {
                console.error('Failed to fetch recent scans:', recentsResult.reason);
            }

            if (statsResult.status === 'rejected' && recentsResult.status === 'rejected') {
                setError('Failed to load dashboard data. Please try again.');
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchDashboardData();
        }
    }, [isAuthenticated, user, fetchDashboardData]);

    if (isLoading || !isAuthenticated || !user) {
        return <LoadingPage text={t('common.loading')} />;
    }

    const planName = getTierName(user.tier);
    const planColor = getTierTextColorAlt(user.tier);

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-7xl mx-auto px-6 py-12'>
                <div className='mb-10'>
                    <h1 className='text-4xl md:text-5xl font-bold mb-3'>{t('dashboard.title')}</h1>
                    <p className='text-slate-300 text-lg'>
                        {t('dashboard.welcomeBack', undefined, {
                            username: user.username || user.email?.split('@')[0] || 'User',
                        })}
                    </p>
                </div>

                <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8'>
                    <div className='flex items-center gap-4'>
                        {user.avatarUrl ? (
                            <Image
                                src={user.avatarUrl}
                                alt={user.username || user.email || 'User'}
                                width={64}
                                height={64}
                                className='w-16 h-16 rounded-full object-cover'
                                unoptimized
                            />
                        ) : (
                            <div className='w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-semibold text-xl'>
                                {user.username?.charAt(0).toUpperCase() ||
                                    user.email?.charAt(0).toUpperCase() ||
                                    'U'}
                            </div>
                        )}
                        <div>
                            <h2 className='text-2xl font-semibold'>
                                {user.username || t('common.user')}
                            </h2>
                            <div className='flex items-center gap-2 mt-2'>
                                <p className={`text-sm ${planColor}`}>{planName}</p>
                                {user.isAdmin && (
                                    <span className='text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30 font-semibold'>
                                        👑 {t('admin.stats.admins')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className='bg-red-900/20 border border-red-500/30 rounded-xl p-6 mb-8'>
                        <div className='flex items-start gap-4'>
                            <svg
                                className='w-6 h-6 text-red-400 flex-shrink-0 mt-0.5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                />
                            </svg>
                            <div className='flex-1'>
                                <h3 className='text-red-400 font-semibold mb-1'>
                                    {t('dashboard.errorLoadingData')}
                                </h3>
                                <p className='text-red-300 text-sm'>{error}</p>
                                <button
                                    onClick={() => {
                                        setLoadingStats(true);
                                        fetchDashboardData();
                                    }}
                                    className='mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-sm transition-colors'
                                >
                                    {t('dashboard.tryAgain')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-10'>
                    <Link
                        href='/dashboard/api-keys'
                        className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-5 hover:border-purple-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-purple-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-purple-300 transition-colors'>
                            {t('menu.apiKeys')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('dashboard.manageKeys')}
                        </p>
                    </Link>

                    <Link
                        href='/dashboard/badges'
                        className='bg-slate-800/40 backdrop-blur-md border border-teal-500/20 rounded-xl p-5 hover:border-teal-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-teal-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-teal-300 transition-colors'>
                            {t('badges.title')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('badges.manageVerification')}
                        </p>
                    </Link>

                    <Link
                        href='/dashboard/scans'
                        className='bg-slate-800/40 backdrop-blur-md border border-blue-500/20 rounded-xl p-5 hover:border-blue-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-blue-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-blue-300 transition-colors'>
                            {t('menu.scanHistory')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('dashboard.viewPastScans')}
                        </p>
                    </Link>

                    <Link
                        href='/dashboard/usage'
                        className='bg-slate-800/40 backdrop-blur-md border border-green-500/20 rounded-xl p-5 hover:border-green-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-green-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-green-300 transition-colors'>
                            {t('menu.usage')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('dashboard.apiStatistics')}
                        </p>
                    </Link>

                    <Link
                        href='/dashboard/notifications'
                        className='bg-slate-800/40 backdrop-blur-md border border-orange-500/20 rounded-xl p-5 hover:border-orange-400/50 transition-all duration-200 group relative'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-orange-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-orange-300 transition-colors'>
                            {t('menu.notifications')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('dashboard.alertsUpdates')}
                        </p>
                        {scanStats && scanStats.threatsDetected > 0 && (
                            <div className='absolute top-3 right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold'>
                                {scanStats.threatsDetected}
                            </div>
                        )}
                    </Link>

                    <Link
                        href='/'
                        className='bg-slate-800/40 backdrop-blur-md border border-pink-500/20 rounded-xl p-5 hover:border-pink-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-pink-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-pink-300 transition-colors'>
                            {t('dashboard.uploadFile')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('dashboard.scanNewFile')}
                        </p>
                    </Link>

                    <Link
                        href='/dashboard/loader'
                        className='bg-slate-800/40 backdrop-blur-md border border-cyan-500/20 rounded-xl p-5 hover:border-cyan-400/50 transition-all duration-200 group'
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className='w-10 h-10 bg-cyan-600/80 rounded-lg flex items-center justify-center'>
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
                                        d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
                                    />
                                </svg>
                            </div>
                            <svg
                                className='w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </div>
                        <h3 className='font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors'>
                            {t('loader.title')}
                        </h3>
                        <p className='text-gray-400 text-sm leading-relaxed'>
                            {t('loader.description')}
                        </p>
                    </Link>

                    {user.isAdmin && (
                        <Link
                            href='/admin'
                            className='bg-slate-800/40 backdrop-blur-md border border-red-500/20 rounded-xl p-5 hover:border-red-400/50 transition-all duration-200 group relative overflow-hidden'
                        >
                            <div className='absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-2xl'></div>
                            <div className='flex items-center justify-between mb-3 relative'>
                                <div className='w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/50'>
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
                                            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                        />
                                    </svg>
                                </div>
                                <svg
                                    className='w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M9 5l7 7-7 7'
                                    />
                                </svg>
                            </div>
                            <div className='flex items-center gap-2 mb-1'>
                                <h3 className='font-bold text-red-400 group-hover:text-red-300 transition-colors'>
                                    {t('admin.adminPanel')}
                                </h3>
                                <span className='text-xs'>👑</span>
                            </div>
                            <p className='text-gray-400 text-sm leading-relaxed'>
                                {t('admin.manageUsersSystem')}
                            </p>
                        </Link>
                    )}
                </div>

                <div className='mb-8'>
                    <RateLimitUsage />
                </div>

                {loadingStats ? (
                    <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8'>
                        <h3 className='text-xl font-semibold mb-6'>
                            {t('dashboard.yourActivity')}
                        </h3>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                            {[1, 2, 3, 4].map(i => (
                                <div
                                    key={i}
                                    className='bg-slate-900/50 rounded-lg p-4 overflow-hidden relative'
                                >
                                    <div className='h-4 bg-slate-700 rounded w-20 mb-3 animate-shimmer'></div>
                                    <div className='h-8 bg-slate-700 rounded w-16 animate-shimmer'></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : scanStats && scanStats.totalScans > 0 ? (
                    <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8'>
                        <h3 className='text-xl font-semibold mb-6'>
                            {t('dashboard.yourActivity')}
                        </h3>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                            <div className='bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4'>
                                <div className='flex items-center justify-between mb-2'>
                                    <span className='text-blue-400 text-sm font-medium'>
                                        {t('dashboard.totalScans')}
                                    </span>
                                    <svg
                                        className='w-5 h-5 text-blue-400'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                        />
                                    </svg>
                                </div>
                                <p className='text-3xl font-bold text-white'>
                                    {scanStats.totalScans}
                                </p>
                            </div>

                            <div className='bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-4'>
                                <div className='flex items-center justify-between mb-2'>
                                    <span className='text-green-400 text-sm font-medium'>
                                        {t('dashboard.cleanFiles')}
                                    </span>
                                    <svg
                                        className='w-5 h-5 text-green-400'
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
                                </div>
                                <p className='text-3xl font-bold text-white'>
                                    {scanStats.cleanFiles}
                                </p>
                            </div>

                            <div className='bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-500/30 rounded-lg p-4'>
                                <div className='flex items-center justify-between mb-2'>
                                    <span className='text-red-400 text-sm font-medium'>
                                        {t('dashboard.threatsFound')}
                                    </span>
                                    <svg
                                        className='w-5 h-5 text-red-400'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                        />
                                    </svg>
                                </div>
                                <p className='text-3xl font-bold text-white'>
                                    {scanStats.threatsDetected}
                                </p>
                            </div>

                            <div className='bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4'>
                                <div className='flex items-center justify-between mb-2'>
                                    <span className='text-purple-400 text-sm font-medium'>
                                        {t('dashboard.avgScore')}
                                    </span>
                                    <svg
                                        className='w-5 h-5 text-purple-400'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z'
                                        />
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'
                                        />
                                    </svg>
                                </div>
                                <p className='text-3xl font-bold text-white'>
                                    {scanStats.averageScore.toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {loadingStats ? (
                    <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8'>
                        <div className='flex items-center justify-between mb-6'>
                            <div className='h-6 bg-slate-700 rounded w-32 animate-shimmer'></div>
                            <div className='h-4 bg-slate-700 rounded w-20 animate-shimmer'></div>
                        </div>
                        <div className='space-y-3'>
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className='bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 overflow-hidden'
                                >
                                    <div className='flex items-center justify-between'>
                                        <div className='flex-1'>
                                            <div className='h-5 bg-slate-700 rounded w-48 mb-2 animate-shimmer'></div>
                                            <div className='h-4 bg-slate-700 rounded w-32 animate-shimmer'></div>
                                        </div>
                                        <div className='w-12 h-12 bg-slate-700 rounded-full animate-shimmer'></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : recentScans.length > 0 ? (
                    <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8'>
                        <div className='flex items-center justify-between mb-6'>
                            <h3 className='text-xl font-semibold'>{t('dashboard.recentScans')}</h3>
                            <Link
                                href='/dashboard/scans'
                                className='text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md px-2 py-1'
                            >
                                {t('dashboard.viewAll')}
                            </Link>
                        </div>
                        <div className='space-y-3'>
                            {recentScans.map(scan => (
                                <div
                                    key={scan.id}
                                    className='bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-purple-500'
                                    onClick={() => {
                                        if (scan.fileHash) {
                                            router.push(
                                                `/result/${encodeHashForUrl(scan.fileHash)}`
                                            );
                                        } else {
                                            router.push(`/result/${scan.id}`);
                                        }
                                    }}
                                    tabIndex={0}
                                    role='button'
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (scan.fileHash) {
                                                router.push(
                                                    `/result/${encodeHashForUrl(scan.fileHash)}`
                                                );
                                            } else {
                                                router.push(`/result/${scan.id}`);
                                            }
                                        }
                                    }}
                                >
                                    <div className='flex items-center justify-between'>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-center gap-2 mb-1'>
                                                <p className='text-white font-medium truncate'>
                                                    {scan.fileName}
                                                </p>
                                                {scan.isThreat ? (
                                                    <span className='flex-shrink-0 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30'>
                                                        {t('scans.threat')}
                                                    </span>
                                                ) : (
                                                    <span className='flex-shrink-0 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30'>
                                                        {t('scans.clean')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='flex items-center gap-3 text-xs text-slate-400'>
                                                <span>
                                                    {t('scans.score')}: {scan.score}/100
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {new Date(scan.scanDate).toLocaleDateString()}{' '}
                                                    {new Date(scan.scanDate).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={`ml-4 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                                scan.score >= 75
                                                    ? 'bg-red-900/30 text-red-400'
                                                    : scan.score >= 50
                                                      ? 'bg-orange-900/30 text-orange-400'
                                                      : scan.score >= 25
                                                        ? 'bg-yellow-900/30 text-yellow-400'
                                                        : 'bg-green-900/30 text-green-400'
                                            }`}
                                        >
                                            <span className='font-bold text-sm'>{scan.score}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !loadingStats && scanStats && scanStats.totalScans === 0 ? (
                    <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-12 mb-8 text-center'>
                        <div className='max-w-md mx-auto'>
                            <div className='w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6'>
                                <svg
                                    className='w-10 h-10 text-purple-400'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                    />
                                </svg>
                            </div>
                            <h3 className='text-2xl font-bold text-white mb-3'>
                                {t('dashboard.noScansYet')}
                            </h3>
                            <p className='text-gray-400 mb-6'>{t('dashboard.uploadFirstFile')}</p>
                            <Link
                                href='/'
                                className='inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                            >
                                <svg
                                    className='w-5 h-5'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                    />
                                </svg>
                                <span>{t('dashboard.uploadFile')}</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6'>
                    <h3 className='text-xl font-semibold mb-6'>
                        <span className={planColor}>{planName}</span>
                    </h3>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                        <div className='bg-slate-900/50 rounded-lg p-4'>
                            <p className='text-slate-400 text-sm mb-2'>
                                {t('dashboard.apiRequests')}
                            </p>
                            <p className='text-lg font-bold text-white leading-tight'>
                                <span className='text-green-400'>
                                    {getTierRateLimitNumber(user.tier).toLocaleString()}
                                </span>{' '}
                                {t('dashboard.reads')}
                                <br />
                                <span className='text-blue-400'>
                                    {getTierWriteLimit(user.tier)}
                                </span>{' '}
                                {t('dashboard.writes')}
                                <br />
                                <span className='text-purple-400'>
                                    {getTierUploadLimit(user.tier)}
                                </span>{' '}
                                {t('dashboard.uploads')}
                                <br />
                                <span className='text-xs text-slate-400 font-normal'>
                                    {t('dashboard.perHour')}
                                </span>
                            </p>
                        </div>
                        <div className='bg-slate-900/50 rounded-lg p-4'>
                            <p className='text-slate-400 text-sm mb-2'>
                                {t('dashboard.fileSizeLimit')}
                            </p>
                            <p className='text-2xl font-bold text-white'>
                                {getTierFileSizeLimit(user.tier)}{' '}
                                <span className='text-sm text-slate-400 font-normal'>MB</span>
                            </p>
                        </div>
                        <div className='bg-slate-900/50 rounded-lg p-4'>
                            <p className='text-slate-400 text-sm mb-2'>
                                {t('dashboard.prioritySupport')}
                            </p>
                            <p className='text-2xl font-bold text-white'>
                                {hasPrioritySupport(user.tier) ? '✓' : '✗'}
                            </p>
                        </div>
                    </div>
                    {user.tier === TIER_FREE && (
                        <div className='p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg'>
                            <p className='text-purple-300 text-sm'>
                                {t('dashboard.upgradePremium')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
