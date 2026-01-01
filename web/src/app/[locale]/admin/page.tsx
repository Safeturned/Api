'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getTierName } from '@/lib/tierConstants';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api-client';

interface SystemAnalytics {
    users: {
        total: number;
        active: number;
        admins: number;
        byTier: Array<{ tier: number; count: number }>;
    };
    scans: {
        total: number;
        malicious: number;
        clean: number;
    };
    apiKeys: {
        total: number;
        active: number;
    };
}

export default function AdminDashboard() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            router.push('/');
            return;
        }

        if (user?.isAdmin) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            loadAnalytics(abortControllerRef.current.signal);

            return () => {
                abortControllerRef.current?.abort();
            };
        }
    }, [user, isAuthenticated, isLoading, router]);

    const loadAnalytics = async (signal?: AbortSignal) => {
        try {
            const data = await api.get<SystemAnalytics>('admin/analytics/system', { signal });
            setAnalytics(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            setError(err instanceof Error ? err.message : t('admin.analytics.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || loading) {
        return (
            <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
                <Navigation />
                <div className='flex-1 flex items-center justify-center'>
                    <LoadingSpinner text={t('common.loading')} />
                </div>
                <Footer />
            </div>
        );
    }

    if (!isAuthenticated || !user?.isAdmin) {
        return null;
    }

    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
            <Navigation />
            <div className='flex-1 px-6 py-8'>
                <div className='max-w-7xl mx-auto'>
                    <div className='mb-8'>
                        <h1 className='text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            {t('admin.title')}
                        </h1>
                        <p className='text-gray-400'>{t('admin.description')}</p>
                    </div>

                    {error && (
                        <div className='bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6'>
                            <p className='text-red-300'>{error}</p>
                        </div>
                    )}

                    {analytics && (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                <div className='flex items-center justify-between mb-2'>
                                    <h3 className='text-gray-400 text-sm font-medium'>
                                        {t('admin.stats.totalUsers')}
                                    </h3>
                                    <svg
                                        className='w-8 h-8 text-purple-400'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
                                        />
                                    </svg>
                                </div>
                                <p className='text-3xl font-bold text-white'>
                                    {analytics.users.total}
                                </p>
                                <p className='text-sm text-gray-500 mt-1'>
                                    {analytics.users.active} {t('common.active')}
                                </p>
                            </div>

                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                <div className='flex items-center justify-between mb-2'>
                                    <h3 className='text-gray-400 text-sm font-medium'>
                                        {t('admin.stats.totalScans')}
                                    </h3>
                                    <svg
                                        className='w-8 h-8 text-blue-400'
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
                                    {analytics.scans.total}
                                </p>
                                <p className='text-sm text-gray-500 mt-1'>
                                    {analytics.scans.malicious} {t('common.malicious')}
                                </p>
                            </div>

                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                <div className='flex items-center justify-between mb-2'>
                                    <h3 className='text-gray-400 text-sm font-medium'>
                                        {t('admin.stats.apiKeys')}
                                    </h3>
                                    <svg
                                        className='w-8 h-8 text-green-400'
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
                                <p className='text-3xl font-bold text-white'>
                                    {analytics.apiKeys.total}
                                </p>
                                <p className='text-sm text-gray-500 mt-1'>
                                    {analytics.apiKeys.active} {t('common.active')}
                                </p>
                            </div>

                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                <div className='flex items-center justify-between mb-2'>
                                    <h3 className='text-gray-400 text-sm font-medium'>
                                        {t('admin.stats.admins')}
                                    </h3>
                                    <svg
                                        className='w-8 h-8 text-yellow-400'
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
                                <p className='text-3xl font-bold text-white'>
                                    {analytics.users.admins}
                                </p>
                                <p className='text-sm text-gray-500 mt-1'>
                                    {t('common.administrators')}
                                </p>
                            </div>
                        </div>
                    )}

                    {analytics && analytics.users.byTier.length > 0 && (
                        <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-8'>
                            <h2 className='text-xl font-bold mb-4 text-white'>
                                {t('admin.stats.usersByTier')}
                            </h2>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                {analytics.users.byTier.map(item => (
                                    <div key={item.tier} className='bg-slate-700/30 rounded-lg p-4'>
                                        <p className='text-gray-400 text-sm'>
                                            {getTierName(item.tier)}
                                        </p>
                                        <p className='text-2xl font-bold text-white'>
                                            {item.count}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <Link
                            href='/admin/users'
                            className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-200 group'
                        >
                            <div className='flex items-center justify-between mb-4'>
                                <h2 className='text-2xl font-bold text-white group-hover:text-purple-300 transition-colors'>
                                    {t('admin.userManagement.title')}
                                </h2>
                                <svg
                                    className='w-6 h-6 text-purple-400'
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
                            <p className='text-gray-400'>
                                {t('admin.userManagement.viewAndManage')}
                            </p>
                        </Link>

                        <Link
                            href='/admin/analytics'
                            className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-200 group'
                        >
                            <div className='flex items-center justify-between mb-4'>
                                <h2 className='text-2xl font-bold text-white group-hover:text-purple-300 transition-colors'>
                                    {t('admin.analytics.title')}
                                </h2>
                                <svg
                                    className='w-6 h-6 text-purple-400'
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
                            <p className='text-gray-400'>{t('admin.analytics.description')}</p>
                        </Link>
                    </div>
                </div>
            </div>
            <BackToTop />
            <Footer />
        </div>
    );
}
