'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingPage from '@/components/LoadingPage';
import { api } from '@/lib/api-client';
import { STORAGE_KEYS } from '@/lib/storage-constants';
import { useTranslation } from '@/hooks/useTranslation';

interface RecentScan {
    id: string;
    fileName: string;
    score: number;
    isThreat: boolean;
    scanDate: string;
    scanTimeMs: number;
}

interface Notification {
    id: string;
    type: 'threat' | 'clean' | 'info';
    title: string;
    message: string;
    timestamp: string;
    link?: string;
    icon: string;
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'threat' | 'clean' | 'info'>('all');
    const [showInfoBox, setShowInfoBox] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const infoBoxClosed = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_INFO_CLOSED);
        if (infoBoxClosed === 'true') {
            setShowInfoBox(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/notifications');
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (isAuthenticated && user) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            fetchNotifications(abortControllerRef.current.signal);

            return () => {
                abortControllerRef.current?.abort();
            };
        }
    }, [isAuthenticated, user]);

    const handleCloseInfoBox = () => {
        setShowInfoBox(false);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_INFO_CLOSED, 'true');
    };

    const fetchNotifications = async (signal?: AbortSignal) => {
        try {
            const scans = await api.get<RecentScan[]>('users/me/scans/recent?limit=20', { signal });

            const scanNotifications: Notification[] = scans.map(scan => {
                if (scan.isThreat) {
                    return {
                        id: scan.id,
                        type: 'threat' as const,
                        title: t('notifications.threatDetected'),
                        message: `${scan.fileName} - Risk Score: ${scan.score}/100`,
                        timestamp: scan.scanDate,
                        link: `/scan/${scan.id}`,
                        icon: '🚨',
                    };
                } else {
                    return {
                        id: scan.id,
                        type: 'clean' as const,
                        title: t('notifications.fileScannedSuccess'),
                        message: `${scan.fileName} - ${t('notifications.noThreatsDetected')} (Score: ${scan.score}/100)`,
                        timestamp: scan.scanDate,
                        link: `/scan/${scan.id}`,
                        icon: '✅',
                    };
                }
            });

            setNotifications(scanNotifications);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotifications =
        filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'threat':
                return 'border-red-500/30 bg-red-900/10 hover:border-red-500/50';
            case 'clean':
                return 'border-green-500/30 bg-green-900/10 hover:border-green-500/50';
            case 'info':
                return 'border-blue-500/30 bg-blue-900/10 hover:border-blue-500/50';
            default:
                return 'border-slate-700 bg-slate-800/30';
        }
    };

    const getFilterButtonClass = (filterType: typeof filter) => {
        return filter === filterType
            ? 'bg-purple-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600';
    };

    if (isLoading || !isAuthenticated || !user) {
        return <LoadingPage text={t('common.loading')} />;
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-5xl mx-auto px-6 py-12'>
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
                        <h1 className='text-4xl font-bold'>{t('notifications.title')}</h1>
                    </div>
                    <p className='text-slate-400'>{t('notifications.description')}</p>
                </div>

                <div className='flex flex-wrap gap-3 mb-6'>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${getFilterButtonClass('all')}`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('threat')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${getFilterButtonClass('threat')}`}
                    >
                        🚨 Threats ({notifications.filter(n => n.type === 'threat').length})
                    </button>
                    <button
                        onClick={() => setFilter('clean')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${getFilterButtonClass('clean')}`}
                    >
                        ✅ Clean ({notifications.filter(n => n.type === 'clean').length})
                    </button>
                </div>

                {loading ? (
                    <div className='text-center py-12'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                        <p className='text-slate-300'>{t('common.loading')}</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center'>
                        <div className='w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6'>
                            <svg
                                className='w-10 h-10 text-slate-400'
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
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('notifications.noNotifications')}
                        </h2>
                        <p className='text-slate-400 mb-6'>
                            {filter === 'all'
                                ? t('notifications.noNotificationsDesc')
                                : t('notifications.noFilterNotifications', undefined, { filter })}
                        </p>
                        <Link
                            href='/'
                            className='inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                        >
                            {t('notifications.uploadFirst')}
                        </Link>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 transition-all duration-200 hover:scale-[1.01] ${getNotificationColor(notification.type)} ${notification.link ? 'cursor-pointer' : ''}`}
                                onClick={() => notification.link && router.push(notification.link)}
                            >
                                <div className='flex items-start gap-4'>
                                    <div className='text-3xl flex-shrink-0'>
                                        {notification.icon}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-start justify-between mb-2'>
                                            <div>
                                                <h3 className='text-lg font-semibold text-white mb-1'>
                                                    {notification.title}
                                                </h3>
                                                <p className='text-slate-300 text-sm break-words'>
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {notification.type === 'threat' && (
                                                <span className='flex-shrink-0 ml-3 bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full border border-red-500/30 font-medium'>
                                                    {t('notifications.actionRequired')}
                                                </span>
                                            )}
                                        </div>
                                        <div className='flex items-center gap-4 text-xs text-slate-400 mt-3'>
                                            <span className='flex items-center gap-1'>
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
                                                        d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                                                    />
                                                </svg>
                                                {new Date(notification.timestamp).toLocaleString()}
                                            </span>
                                            {notification.link && (
                                                <span className='flex items-center gap-1 text-purple-400 hover:text-purple-300'>
                                                    {t('notifications.viewDetails')}
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
                                                            d='M9 5l7 7-7 7'
                                                        />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showInfoBox && (
                    <div className='mt-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 relative'>
                        <button
                            onClick={handleCloseInfoBox}
                            className='absolute top-4 right-4 text-blue-400 hover:text-blue-300 transition-colors'
                            aria-label='Close info box'
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
                        <div className='flex items-start gap-3 pr-8'>
                            <svg
                                className='w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                            </svg>
                            <div>
                                <h3 className='text-blue-400 font-semibold mb-2'>
                                    About Notifications
                                </h3>
                                <p className='text-slate-300 text-sm'>
                                    This page shows notifications for all your scan results. Threat
                                    notifications indicate files that may be dangerous and require
                                    your attention. Clean notifications confirm that files passed
                                    our security checks.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
