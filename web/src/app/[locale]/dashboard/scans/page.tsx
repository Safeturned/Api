'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingPage from '@/components/LoadingPage';
import { api } from '@/lib/api-client';
import { encodeHashForUrl } from '@/lib/utils';

interface ScanRecord {
    id: number;
    fileName: string;
    score: number;
    isThreat: boolean;
    scanTimeMs: number;
    scanDate: string;
    fileHash?: string;
}

interface PaginationInfo {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

interface ScanStats {
    totalScans: number;
    threatsDetected: number;
    cleanFiles: number;
    averageScore: number;
    averageScanTime: number;
}

export default function ScansPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [scans, setScans] = useState<ScanRecord[]>([]);
    const [stats, setStats] = useState<ScanStats | null>(null);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchFilter, setSearchFilter] = useState('');
    const [debouncedSearchFilter, setDebouncedSearchFilter] = useState('');
    const [isLoadingScans, setIsLoadingScans] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/scans');
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearchFilter(searchFilter);
            searchDebounceRef.current = null;
        }, 500);

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchFilter]);

    useEffect(() => {
        if (isAuthenticated) {
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            fetchScans(abortControllerRef.current.signal);
            fetchStats(abortControllerRef.current.signal);

            return () => {
                abortControllerRef.current?.abort();
            };
        }
    }, [isAuthenticated, currentPage, debouncedSearchFilter]);

    const fetchScans = async (signal?: AbortSignal) => {
        try {
            setIsLoadingScans(true);
            setError(null);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                pageSize: '20',
                ...(debouncedSearchFilter && { filter: debouncedSearchFilter }),
            });

            const data = await api.get<{ scans: ScanRecord[]; pagination: PaginationInfo }>(
                `users/me/scans?${params}`,
                { signal }
            );

            setScans(data.scans || []);
            setPagination(data.pagination);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            console.error('Error fetching scans:', err);
            setError(err instanceof Error ? err.message : 'Failed to load scans');
        } finally {
            setIsLoadingScans(false);
        }
    };

    const fetchStats = async (signal?: AbortSignal) => {
        try {
            const data = await api.get<ScanStats>('users/me/scans/stats', { signal });
            setStats(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch stats:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getThreatBadge = (isThreat: boolean) => {
        if (isThreat) {
            return (
                <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-900/30 text-red-300 border border-red-700'>
                    {t('scans.threatDetected')}
                </span>
            );
        }
        return (
            <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-300 border border-green-700'>
                {t('scans.cleanFile')}
            </span>
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-red-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-green-400';
    };

    if (isLoading || !isAuthenticated || !user) {
        return <LoadingPage text={t('common.loading')} />;
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-7xl mx-auto px-6 py-12'>
                <div className='mb-10'>
                    <Link
                        href='/dashboard'
                        className='text-purple-400 hover:text-purple-300 mb-3 inline-block text-sm'
                    >
                        {t('dashboard.backToDashboard')}
                    </Link>
                    <h1 className='text-4xl md:text-5xl font-bold mb-3'>{t('scans.title')}</h1>
                    <p className='text-slate-300 text-lg'>
                        {t('scans.description', 'View your past file scans and results')}
                    </p>
                </div>

                {stats && (
                    <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5'>
                            <div className='text-slate-400 text-xs mb-2'>
                                {t('dashboard.totalScans')}
                            </div>
                            <div className='text-2xl md:text-3xl font-bold text-white'>
                                {stats.totalScans}
                            </div>
                        </div>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5'>
                            <div className='text-slate-400 text-xs mb-2'>
                                {t('dashboard.threatsFound')}
                            </div>
                            <div className='text-2xl md:text-3xl font-bold text-red-400'>
                                {stats.threatsDetected}
                            </div>
                        </div>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5'>
                            <div className='text-slate-400 text-xs mb-2'>
                                {t('dashboard.cleanFiles')}
                            </div>
                            <div className='text-2xl md:text-3xl font-bold text-green-400'>
                                {stats.cleanFiles}
                            </div>
                        </div>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5'>
                            <div className='text-slate-400 text-xs mb-2'>
                                {t('dashboard.avgScore')}
                            </div>
                            <div className='text-2xl md:text-3xl font-bold text-white'>
                                {stats.averageScore.toFixed(1)}
                            </div>
                        </div>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5'>
                            <div className='text-slate-400 text-xs mb-2'>
                                {t('scans.avgTime', 'Avg Time')}
                            </div>
                            <div className='text-2xl md:text-3xl font-bold text-white'>
                                {Math.round(stats.averageScanTime)}ms
                            </div>
                        </div>
                    </div>
                )}

                <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-6'>
                    <input
                        type='text'
                        placeholder={t('scans.searchPlaceholder', 'Search by filename...')}
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        className='w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                    />
                </div>

                {error && (
                    <div className='bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6'>
                        <p className='text-red-300'>{error}</p>
                    </div>
                )}

                {isLoadingScans ? (
                    <div className='text-center py-12' role='status' aria-live='polite'>
                        <div
                            className='inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mb-4'
                            aria-hidden='true'
                        ></div>
                        <p className='text-slate-300'>{t('scans.loading', 'Loading scans...')}</p>
                    </div>
                ) : scans.length === 0 ? (
                    <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center'>
                        <svg
                            className='w-16 h-16 text-slate-600 mx-auto mb-4'
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
                        <h3 className='text-xl font-semibold mb-2'>
                            {t('scans.noScans', 'No Scans Yet')}
                        </h3>
                        <p className='text-slate-400 mb-6'>
                            {t('scans.noScansDesc', 'Upload a file to see scan results here')}
                        </p>
                        <Link
                            href='/'
                            className='inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors'
                        >
                            {t('dashboard.uploadFile')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden'>
                            <div className='overflow-x-auto'>
                                <table className='w-full'>
                                    <thead className='bg-slate-900/50 border-b border-slate-700/50'>
                                        <tr>
                                            <th className='px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-300'>
                                                {t('scans.fileName')}
                                            </th>
                                            <th className='px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-300'>
                                                {t('scans.status')}
                                            </th>
                                            <th className='px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-300'>
                                                {t('scans.score')}
                                            </th>
                                            <th className='px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-300'>
                                                {t('scans.time')}
                                            </th>
                                            <th className='px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-300'>
                                                {t('scans.date')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-700/50'>
                                        {scans.map(scan => (
                                            <tr
                                                key={scan.id}
                                                className={`hover:bg-slate-900/30 transition-colors ${scan.fileHash ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                                                onClick={() => {
                                                    if (scan.fileHash) {
                                                        router.push(
                                                            `/result/${encodeHashForUrl(scan.fileHash)}`
                                                        );
                                                    } else {
                                                        alert(
                                                            t(
                                                                'scans.resultUnavailable',
                                                                'Результат сканирования недоступен. Хеш файла не найден.'
                                                            )
                                                        );
                                                    }
                                                }}
                                            >
                                                <td className='px-4 md:px-6 py-4'>
                                                    <div className='text-white font-medium truncate max-w-md'>
                                                        {scan.fileName}
                                                    </div>
                                                </td>
                                                <td className='px-4 md:px-6 py-4'>
                                                    {getThreatBadge(scan.isThreat)}
                                                </td>
                                                <td className='px-4 md:px-6 py-4'>
                                                    <span
                                                        className={`text-base md:text-lg font-bold ${getScoreColor(scan.score)}`}
                                                    >
                                                        {scan.score.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className='px-4 md:px-6 py-4 text-slate-300 text-sm'>
                                                    {scan.scanTimeMs}ms
                                                </td>
                                                <td className='px-4 md:px-6 py-4 text-slate-300 text-sm'>
                                                    {formatDate(scan.scanDate)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {pagination && pagination.totalPages > 1 && (
                            <div className='mt-6 flex items-center justify-between'>
                                <div className='text-slate-400 text-sm'>
                                    {t('scans.pagination', undefined, {
                                        page: pagination.page,
                                        totalPages: pagination.totalPages,
                                        totalCount: pagination.totalCount,
                                    })}
                                </div>
                                <div className='flex gap-2'>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPreviousPage}
                                        className='px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors'
                                    >
                                        {t('scans.previous')}
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={!pagination.hasNextPage}
                                        className='px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors'
                                    >
                                        {t('scans.next')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
