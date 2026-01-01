'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getTierName, TIER_BADGE_COLORS } from '@/lib/tierConstants';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api-client';

interface RecentUser {
    id: string;
    email: string | null;
    username: string | null;
    tier: number;
    createdAt: string;
}

interface RecentScan {
    id: string;
    fileName: string;
    sha256Hash: string;
    isMalicious: boolean;
    uploadedAt: string;
    userId: string | null;
    username: string | null;
}

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
    recent: {
        users: RecentUser[];
        scans: RecentScan[];
    };
}

export default function AdminAnalyticsPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            router.push('/');
            return;
        }

        if (user?.isAdmin) {
            loadAnalytics();
        }
    }, [user, isAuthenticated, isLoading, router]);

    const loadAnalytics = async () => {
        try {
            const data = await api.get<SystemAnalytics>('admin/analytics/system');
            setAnalytics(data);
        } catch (err) {
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const maliciousPercentage = analytics
        ? ((analytics.scans.malicious / analytics.scans.total) * 100).toFixed(1)
        : '0';

    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
            <Navigation />
            <div className='flex-1 px-6 py-8'>
                <div className='max-w-7xl mx-auto'>
                    <div className='mb-8'>
                        <Link
                            href='/admin'
                            className='text-purple-400 hover:text-purple-300 transition-colors mb-4 inline-flex items-center gap-2'
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
                                    d='M15 19l-7-7 7-7'
                                />
                            </svg>
                            {t('admin.backToDashboard')}
                        </Link>
                        <h1 className='text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            {t('admin.analytics.title')}
                        </h1>
                        <p className='text-gray-400'>{t('admin.analytics.description')}</p>
                    </div>

                    {error && (
                        <div className='bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6'>
                            <p className='text-red-300'>{error}</p>
                        </div>
                    )}

                    {analytics && (
                        <>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
                                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                    <h3 className='text-gray-400 text-sm font-medium mb-4'>
                                        User Statistics
                                    </h3>
                                    <div className='space-y-2'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Total Users</span>
                                            <span className='text-white font-bold'>
                                                {analytics.users.total}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>
                                                {t('admin.userManagement.active')}
                                            </span>
                                            <span className='text-green-400 font-bold'>
                                                {analytics.users.active}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>
                                                {t('admin.stats.admins')}
                                            </span>
                                            <span className='text-yellow-400 font-bold'>
                                                {analytics.users.admins}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                    <h3 className='text-gray-400 text-sm font-medium mb-4'>
                                        Scan Statistics
                                    </h3>
                                    <div className='space-y-2'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Total Scans</span>
                                            <span className='text-white font-bold'>
                                                {analytics.scans.total}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Clean</span>
                                            <span className='text-green-400 font-bold'>
                                                {analytics.scans.clean}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Malicious</span>
                                            <span className='text-red-400 font-bold'>
                                                {analytics.scans.malicious} ({maliciousPercentage}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                    <h3 className='text-gray-400 text-sm font-medium mb-4'>
                                        API Keys
                                    </h3>
                                    <div className='space-y-2'>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Total Keys</span>
                                            <span className='text-white font-bold'>
                                                {analytics.apiKeys.total}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>
                                                {t('admin.userManagement.active')}
                                            </span>
                                            <span className='text-green-400 font-bold'>
                                                {analytics.apiKeys.active}
                                            </span>
                                        </div>
                                        <div className='flex justify-between'>
                                            <span className='text-gray-300'>Inactive</span>
                                            <span className='text-gray-500 font-bold'>
                                                {analytics.apiKeys.total - analytics.apiKeys.active}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-8'>
                                <h2 className='text-xl font-bold mb-4 text-white'>Users by Tier</h2>
                                <div className='space-y-3'>
                                    {analytics.users.byTier.map(item => {
                                        const percentage = (
                                            (item.count / analytics.users.total) *
                                            100
                                        ).toFixed(1);
                                        return (
                                            <div key={item.tier}>
                                                <div className='flex justify-between mb-2'>
                                                    <span className='text-gray-300'>
                                                        {getTierName(item.tier)}
                                                    </span>
                                                    <span className='text-white font-bold'>
                                                        {item.count} ({percentage}%)
                                                    </span>
                                                </div>
                                                <div className='w-full bg-slate-700 rounded-full h-2'>
                                                    <div
                                                        className={`${TIER_BADGE_COLORS[item.tier]} h-2 rounded-full transition-all duration-300`}
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-8'>
                                <h2 className='text-xl font-bold mb-4 text-white'>
                                    Scan Distribution
                                </h2>
                                <div className='space-y-3'>
                                    <div>
                                        <div className='flex justify-between mb-2'>
                                            <span className='text-gray-300'>Clean Files</span>
                                            <span className='text-green-400 font-bold'>
                                                {analytics.scans.clean} (
                                                {(
                                                    (analytics.scans.clean /
                                                        analytics.scans.total) *
                                                    100
                                                ).toFixed(1)}
                                                %)
                                            </span>
                                        </div>
                                        <div className='w-full bg-slate-700 rounded-full h-2'>
                                            <div
                                                className='bg-green-600 h-2 rounded-full transition-all duration-300'
                                                style={{
                                                    width: `${(analytics.scans.clean / analytics.scans.total) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className='flex justify-between mb-2'>
                                            <span className='text-gray-300'>Malicious Files</span>
                                            <span className='text-red-400 font-bold'>
                                                {analytics.scans.malicious} ({maliciousPercentage}%)
                                            </span>
                                        </div>
                                        <div className='w-full bg-slate-700 rounded-full h-2'>
                                            <div
                                                className='bg-red-600 h-2 rounded-full transition-all duration-300'
                                                style={{ width: `${maliciousPercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                    <div className='flex justify-between items-center mb-4'>
                                        <h2 className='text-xl font-bold text-white'>
                                            Recent Users
                                        </h2>
                                        <Link
                                            href='/admin/users'
                                            className='text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors'
                                        >
                                            Manage Users →
                                        </Link>
                                    </div>
                                    <div className='space-y-3'>
                                        {analytics.recent.users.map(u => (
                                            <div
                                                key={u.id}
                                                className='bg-slate-700/30 rounded-lg p-3'
                                            >
                                                <div className='flex justify-between items-start'>
                                                    <div>
                                                        <p className='text-white font-medium'>
                                                            {u.username || u.email || 'Unknown'}
                                                        </p>
                                                        {u.email && (
                                                            <p className='text-gray-400 text-sm'>
                                                                {u.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`${TIER_BADGE_COLORS[u.tier]} text-white text-xs px-2 py-1 rounded`}
                                                    >
                                                        {getTierName(u.tier)}
                                                    </span>
                                                </div>
                                                <p className='text-gray-500 text-xs mt-2'>
                                                    Joined {formatDate(u.createdAt)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                    <div className='flex justify-between items-center mb-4'>
                                        <h2 className='text-xl font-bold text-white'>
                                            Recent Scans
                                        </h2>
                                        <Link
                                            href='/admin/plugins'
                                            className='text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors'
                                        >
                                            See All →
                                        </Link>
                                    </div>
                                    <div className='space-y-3'>
                                        {analytics.recent.scans.map(scan => (
                                            <div
                                                key={scan.sha256Hash}
                                                className='bg-slate-700/30 rounded-lg p-3'
                                            >
                                                <div className='flex justify-between items-start'>
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='text-white font-medium truncate'>
                                                            {scan.fileName}
                                                        </p>
                                                        <p className='text-gray-400 text-xs font-mono truncate'>
                                                            {scan.sha256Hash}
                                                        </p>
                                                        {scan.username && (
                                                            <p className='text-gray-500 text-xs'>
                                                                by {scan.username}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`${scan.isMalicious ? 'bg-red-600' : 'bg-green-600'} text-white text-xs px-2 py-1 rounded ml-2`}
                                                    >
                                                        {scan.isMalicious ? 'Malicious' : 'Clean'}
                                                    </span>
                                                </div>
                                                <p className='text-gray-500 text-xs mt-2'>
                                                    {formatDate(scan.uploadedAt)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <BackToTop />
            <Footer />
        </div>
    );
}
