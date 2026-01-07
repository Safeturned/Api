'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api-client';
import { VERDICT_LABELS } from '@/lib/adminConstants';
import { encodeHashForUrl } from '@/lib/utils';

const VERDICT_COLOR_MAP: Record<string, string> = {
    None: 'bg-gray-600',
    Clean: 'bg-green-600',
    Suspicious: 'bg-yellow-600',
    Malware: 'bg-red-600',
    PUP: 'bg-orange-600',
    FalsePositive: 'bg-blue-600',
    TakenDown: 'bg-slate-600',
};

const VERDICT_LABEL_MAP: Record<string, string> = {
    None: 'None',
    Clean: 'Clean',
    Trusted: 'Trusted',
    Suspicious: 'Suspicious',
    Malware: 'Malware',
    PUP: 'PUP',
    FalsePositive: 'False Positive',
    TakenDown: 'Taken Down',
    Harmful: 'Harmful',
};

const getVerdictColorByName = (verdict: string | null | undefined): string => {
    if (!verdict) return VERDICT_COLOR_MAP.None;
    return VERDICT_COLOR_MAP[verdict] || VERDICT_COLOR_MAP.None;
};

const getVerdictLabelByName = (verdict: string | null | undefined): string => {
    if (!verdict) return VERDICT_LABEL_MAP.None;
    return VERDICT_LABEL_MAP[verdict] || verdict;
};

interface FileData {
    hash: string;
    fileName: string | null;
    score: number;
    sizeBytes: number;
    lastScanned: string;
    isTakenDown: boolean;
    takenDownAt: string | null;
    currentVerdict: string | null;
    publicMessage: string | null;
    userId: string | null;
    username: string | null;
}

interface FilesResponse {
    page: number;
    pageSize: number;
    totalFiles: number;
    totalPages: number;
    files: FileData[];
}

export default function AdminFilesPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [filesData, setFilesData] = useState<FilesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [verdictFilter, setVerdictFilter] = useState<number | ''>('');
    const [takenDownFilter, setTakenDownFilter] = useState<boolean | ''>('');
    const [maliciousFilter, setMaliciousFilter] = useState<boolean | ''>('');
    const [sortBy, setSortBy] = useState<string>('lastScanned');
    const [sortOrder, setSortOrder] = useState<string>('desc');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [search]);

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: '20',
            });

            if (debouncedSearch) params.append('search', debouncedSearch);
            if (verdictFilter !== '') params.append('verdict', verdictFilter.toString());
            if (takenDownFilter !== '') params.append('isTakenDown', takenDownFilter.toString());
            if (maliciousFilter !== '') params.append('isMalicious', maliciousFilter.toString());
            if (sortBy) params.append('sortBy', sortBy);
            if (sortOrder) params.append('sortOrder', sortOrder);

            const data = await api.get<FilesResponse>(`admin/files?${params}`);
            setFilesData(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin.fileModeration.failedToLoad', 'Failed to load files')
            );
        } finally {
            setLoading(false);
        }
    }, [
        page,
        debouncedSearch,
        verdictFilter,
        takenDownFilter,
        maliciousFilter,
        sortBy,
        sortOrder,
        t,
    ]);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            router.push('/');
            return;
        }

        if (user?.isAdmin) {
            loadFiles();
        }
    }, [user, isAuthenticated, isLoading, router, loadFiles]);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getScoreColor = (score: number): string => {
        if (score >= 70) return 'text-red-400';
        if (score >= 50) return 'text-yellow-400';
        if (score >= 30) return 'text-orange-400';
        return 'text-green-400';
    };

    const getScoreBgColor = (score: number): string => {
        if (score >= 70) return 'bg-red-600/20 border-red-500/50';
        if (score >= 50) return 'bg-yellow-600/20 border-yellow-500/50';
        if (score >= 30) return 'bg-orange-600/20 border-orange-500/50';
        return 'bg-green-600/20 border-green-500/50';
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
                            {t('admin.fileModeration.title', 'File Moderation')}
                        </h1>
                        <p className='text-gray-400'>
                            {t(
                                'admin.fileModeration.description',
                                'Review and moderate scanned files, manage verdicts and takedowns'
                            )}
                        </p>
                    </div>

                    {error && (
                        <div className='bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6'>
                            <p className='text-red-300'>{error}</p>
                        </div>
                    )}

                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-6'>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'>
                            <div className='lg:col-span-2'>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.search', 'Search')}
                                </label>
                                <input
                                    type='text'
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={t(
                                        'admin.fileModeration.searchPlaceholder',
                                        'Filename or hash...'
                                    )}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                />
                            </div>
                            <div>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.verdict', 'Verdict')}
                                </label>
                                <select
                                    value={verdictFilter}
                                    onChange={e => {
                                        setVerdictFilter(
                                            e.target.value === '' ? '' : parseInt(e.target.value)
                                        );
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    <option value=''>
                                        {t('admin.fileModeration.allVerdicts', 'All Verdicts')}
                                    </option>
                                    {Object.entries(VERDICT_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.status', 'Status')}
                                </label>
                                <select
                                    value={takenDownFilter.toString()}
                                    onChange={e => {
                                        setTakenDownFilter(
                                            e.target.value === '' ? '' : e.target.value === 'true'
                                        );
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    <option value=''>
                                        {t('admin.fileModeration.allStatuses', 'All')}
                                    </option>
                                    <option value='true'>
                                        {t('admin.fileModeration.takenDown', 'Taken Down')}
                                    </option>
                                    <option value='false'>
                                        {t('admin.fileModeration.active', 'Active')}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.riskLevel', 'Risk Level')}
                                </label>
                                <select
                                    value={maliciousFilter.toString()}
                                    onChange={e => {
                                        setMaliciousFilter(
                                            e.target.value === '' ? '' : e.target.value === 'true'
                                        );
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    <option value=''>
                                        {t('admin.fileModeration.allRisks', 'All')}
                                    </option>
                                    <option value='true'>
                                        {t('admin.fileModeration.malicious', 'Malicious (≥50)')}
                                    </option>
                                    <option value='false'>
                                        {t('admin.fileModeration.clean', 'Clean (<50)')}
                                    </option>
                                </select>
                            </div>
                            <div className='flex items-end'>
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setDebouncedSearch('');
                                        setVerdictFilter('');
                                        setTakenDownFilter('');
                                        setMaliciousFilter('');
                                        setSortBy('lastScanned');
                                        setSortOrder('desc');
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white hover:bg-slate-700 transition-colors'
                                >
                                    {t('admin.fileModeration.clearFilters', 'Clear Filters')}
                                </button>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mt-4'>
                            <div>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.sortBy', 'Sort By')}
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={e => {
                                        setSortBy(e.target.value);
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    <option value='lastScanned'>
                                        {t('admin.fileModeration.sortLastScanned', 'Last Scanned')}
                                    </option>
                                    <option value='filename'>
                                        {t('admin.fileModeration.sortFilename', 'Filename')}
                                    </option>
                                    <option value='score'>
                                        {t('admin.fileModeration.sortScore', 'Score')}
                                    </option>
                                    <option value='verdict'>
                                        {t('admin.fileModeration.sortVerdict', 'Verdict')}
                                    </option>
                                    <option value='takendown'>
                                        {t('admin.fileModeration.sortTakenDown', 'Taken Down Date')}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className='text-gray-400 text-sm mb-2 block'>
                                    {t('admin.fileModeration.sortOrder', 'Order')}
                                </label>
                                <select
                                    value={sortOrder}
                                    onChange={e => {
                                        setSortOrder(e.target.value);
                                        setPage(1);
                                    }}
                                    className='w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    <option value='desc'>
                                        {t('admin.fileModeration.descending', 'Descending')}
                                    </option>
                                    <option value='asc'>
                                        {t('admin.fileModeration.ascending', 'Ascending')}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {filesData && (
                        <>
                            <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl overflow-hidden mb-6'>
                                <div className='overflow-x-auto'>
                                    <table className='w-full'>
                                        <thead className='bg-slate-700/50'>
                                            <tr>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.file', 'File')}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.score', 'Score')}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.verdict', 'Verdict')}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.status', 'Status')}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.uploader', 'Uploader')}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t(
                                                        'admin.fileModeration.lastScanned',
                                                        'Last Scanned'
                                                    )}
                                                </th>
                                                <th className='text-left p-4 text-gray-400 font-medium'>
                                                    {t('admin.fileModeration.actions', 'Actions')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-700/50'>
                                            {filesData.files.map(file => (
                                                <tr
                                                    key={file.hash}
                                                    className='hover:bg-slate-700/20 transition-colors'
                                                >
                                                    <td className='p-4'>
                                                        <div className='flex flex-col gap-1'>
                                                            <p
                                                                className='text-white font-medium truncate max-w-xs'
                                                                title={file.fileName || 'Unknown'}
                                                            >
                                                                {file.fileName || 'Unknown'}
                                                            </p>
                                                            <p
                                                                className='text-gray-500 text-xs font-mono truncate max-w-xs'
                                                                title={file.hash}
                                                            >
                                                                {file.hash.substring(0, 16)}...
                                                            </p>
                                                            <p className='text-gray-500 text-xs'>
                                                                {formatFileSize(file.sizeBytes)}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className='p-4'>
                                                        <span
                                                            className={`inline-flex items-center px-3 py-1 rounded-lg border ${getScoreBgColor(file.score)}`}
                                                        >
                                                            <span
                                                                className={`font-bold ${getScoreColor(file.score)}`}
                                                            >
                                                                {file.score}
                                                            </span>
                                                            <span className='text-gray-400 ml-1'>
                                                                /100
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td className='p-4'>
                                                        <span
                                                            className={`${getVerdictColorByName(file.currentVerdict)} text-white text-xs px-2 py-1 rounded`}
                                                        >
                                                            {getVerdictLabelByName(file.currentVerdict)}
                                                        </span>
                                                    </td>
                                                    <td className='p-4'>
                                                        {file.isTakenDown ? (
                                                            <div className='flex flex-col gap-1'>
                                                                <span className='bg-red-600/30 border border-red-500/50 text-red-300 text-xs px-2 py-1 rounded w-fit'>
                                                                    {t(
                                                                        'admin.fileModeration.takenDown',
                                                                        'Taken Down'
                                                                    )}
                                                                </span>
                                                                {file.takenDownAt && (
                                                                    <span className='text-gray-500 text-xs'>
                                                                        {formatDate(
                                                                            file.takenDownAt
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className='bg-green-600/30 border border-green-500/50 text-green-300 text-xs px-2 py-1 rounded'>
                                                                {t(
                                                                    'admin.fileModeration.active',
                                                                    'Active'
                                                                )}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className='p-4'>
                                                        {file.username ? (
                                                            <span className='text-gray-300 text-sm'>
                                                                {file.username}
                                                            </span>
                                                        ) : (
                                                            <span className='text-gray-500 text-sm italic'>
                                                                {t(
                                                                    'admin.fileModeration.anonymous',
                                                                    'Anonymous'
                                                                )}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className='p-4'>
                                                        <span className='text-gray-400 text-sm'>
                                                            {formatDate(file.lastScanned)}
                                                        </span>
                                                    </td>
                                                    <td className='p-4'>
                                                        <div className='flex gap-2'>
                                                            <Link
                                                                href={`/admin/files/${encodeHashForUrl(file.hash)}`}
                                                                className='bg-purple-600/20 border border-purple-600/50 text-purple-300 px-3 py-1.5 rounded-lg text-sm hover:bg-purple-600/30 transition-colors inline-flex items-center gap-1'
                                                            >
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
                                                                        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                                                                    />
                                                                    <path
                                                                        strokeLinecap='round'
                                                                        strokeLinejoin='round'
                                                                        strokeWidth={2}
                                                                        d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                                                                    />
                                                                </svg>
                                                                {t(
                                                                    'admin.fileModeration.view',
                                                                    'View'
                                                                )}
                                                            </Link>
                                                            <Link
                                                                href={`/result/${encodeHashForUrl(file.hash)}`}
                                                                target='_blank'
                                                                className='bg-slate-600/20 border border-slate-600/50 text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-600/30 transition-colors inline-flex items-center gap-1'
                                                            >
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
                                                                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                                                    />
                                                                </svg>
                                                                {t(
                                                                    'admin.fileModeration.publicPage',
                                                                    'Public'
                                                                )}
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filesData.files.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className='p-8 text-center text-gray-400'
                                                    >
                                                        {t(
                                                            'admin.fileModeration.noFiles',
                                                            'No files found matching your criteria'
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className='flex items-center justify-between'>
                                <p className='text-gray-400'>
                                    {t('admin.fileModeration.showing', undefined, {
                                        count: filesData.files.length,
                                        total: filesData.totalFiles,
                                    })}
                                </p>
                                {filesData.totalPages > 0 ? (
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className='bg-slate-700/50 border border-slate-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors'
                                        >
                                            {t('admin.fileModeration.previous', 'Previous')}
                                        </button>
                                        <span className='text-white px-4 py-2'>
                                            {t('admin.fileModeration.page', undefined, {
                                                current: page,
                                                total: filesData.totalPages,
                                            })}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setPage(p => Math.min(filesData.totalPages, p + 1))
                                            }
                                            disabled={page === filesData.totalPages}
                                            className='bg-slate-700/50 border border-slate-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors'
                                        >
                                            {t('admin.fileModeration.next', 'Next')}
                                        </button>
                                    </div>
                                ) : (
                                    <span className='text-gray-400 px-4 py-2'>
                                        {t('admin.fileModeration.noPages', 'No pages')}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <BackToTop />
            <Footer />

            {successMessage && (
                <div className='fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl border border-green-500 flex items-center gap-3 animate-slide-up z-50'>
                    <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                        />
                    </svg>
                    <span className='font-medium'>{successMessage}</span>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className='ml-2 hover:bg-green-700 rounded p-1 transition-colors'
                    >
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
                                d='M6 18L18 6M6 6l12 12'
                            />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
