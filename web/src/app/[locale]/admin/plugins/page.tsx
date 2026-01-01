'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api-client';

interface Scan {
    id: string;
    fileName: string;
    sha256Hash: string;
    isMalicious: boolean;
    score: number;
    uploadedAt: string;
    userId: string | null;
    username: string | null;
}

interface ScansResponse {
    page: number;
    pageSize: number;
    totalScans: number;
    totalPages: number;
    scans: Scan[];
}

export default function AdminPluginsPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [isMalicious, setIsMalicious] = useState<'all' | 'malicious' | 'clean'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'filename' | 'score'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            router.push('/');
            return;
        }

        if (user?.isAdmin) {
            loadScans();
        }
    }, [user, isAuthenticated, isLoading, router, page, search, isMalicious, sortBy, sortOrder]);

    const loadScans = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                sortBy,
                sortOrder,
                ...(search && { search }),
                ...(isMalicious !== 'all' && {
                    isMalicious: isMalicious === 'malicious' ? 'true' : 'false',
                }),
            });

            const data = await api.get<ScansResponse>(`admin/scans?${params}`);
            setScans(data.scans);
            setTotalPages(data.totalPages);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load scans');
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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleFilterChange = (filter: 'all' | 'malicious' | 'clean') => {
        setIsMalicious(filter);
        setPage(1);
    };

    const handleSortChange = (newSortBy: 'date' | 'filename' | 'score') => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
        setPage(1);
    };

    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
            <Navigation />
            <div className='flex-1 px-6 py-8'>
                <div className='max-w-7xl mx-auto'>
                    <div className='mb-8'>
                        <Link
                            href='/admin/analytics'
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
                            Back to Analytics
                        </Link>
                        <h1 className='text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            All Scanned Files
                        </h1>
                        <p className='text-gray-400'>View and manage all scanned plugins</p>
                    </div>

                    {error && (
                        <div className='bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6'>
                            <p className='text-red-300'>{error}</p>
                        </div>
                    )}

                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-6'>
                        <div className='space-y-4'>
                            <div className='flex flex-col lg:flex-row gap-4 items-end'>
                                <div className='flex-1'>
                                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                                        Search by filename or hash
                                    </label>
                                    <input
                                        type='text'
                                        value={search}
                                        onChange={handleSearch}
                                        placeholder='Search files...'
                                        className='w-full px-4 py-2 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500'
                                    />
                                </div>
                            </div>

                            <div className='flex flex-col lg:flex-row gap-4'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                                        Status
                                    </label>
                                    <div className='flex gap-2'>
                                        {(['all', 'clean', 'malicious'] as const).map(filter => (
                                            <button
                                                key={filter}
                                                onClick={() => handleFilterChange(filter)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    isMalicious === filter
                                                        ? filter === 'malicious'
                                                            ? 'bg-red-600 text-white'
                                                            : filter === 'clean'
                                                              ? 'bg-green-600 text-white'
                                                              : 'bg-purple-600 text-white'
                                                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                                }`}
                                            >
                                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className='flex flex-wrap gap-2'>
                                <button
                                    onClick={() => handleSortChange('date')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                                        sortBy === 'date'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                    }`}
                                >
                                    Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                                </button>
                                <button
                                    onClick={() => handleSortChange('filename')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                                        sortBy === 'filename'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                    }`}
                                >
                                    Filename{' '}
                                    {sortBy === 'filename' && (sortOrder === 'desc' ? '↓' : '↑')}
                                </button>
                                <button
                                    onClick={() => handleSortChange('score')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                                        sortBy === 'score'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                    }`}
                                >
                                    Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 overflow-x-auto mb-6'>
                        {scans.length === 0 ? (
                            <p className='text-gray-400 text-center py-8'>No scans found</p>
                        ) : (
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-purple-500/20'>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Filename
                                        </th>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Hash
                                        </th>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Status
                                        </th>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Score
                                        </th>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Uploaded by
                                        </th>
                                        <th className='text-left py-3 px-4 text-gray-300 font-semibold'>
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scans.map(scan => (
                                        <tr
                                            key={scan.sha256Hash}
                                            className='border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors'
                                        >
                                            <td className='py-3 px-4 text-white truncate'>
                                                {scan.fileName || 'Unknown'}
                                            </td>
                                            <td className='py-3 px-4 text-gray-400 font-mono text-xs truncate'>
                                                {scan.sha256Hash}
                                            </td>
                                            <td className='py-3 px-4'>
                                                <span
                                                    className={`text-white text-xs px-2 py-1 rounded ${
                                                        scan.isMalicious
                                                            ? 'bg-red-600'
                                                            : 'bg-green-600'
                                                    }`}
                                                >
                                                    {scan.isMalicious ? 'Malicious' : 'Clean'}
                                                </span>
                                            </td>
                                            <td className='py-3 px-4'>
                                                <span
                                                    className={`${
                                                        scan.score >= 50
                                                            ? 'text-red-400'
                                                            : 'text-green-400'
                                                    }`}
                                                >
                                                    {scan.score.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className='py-3 px-4 text-gray-400'>
                                                {scan.username || 'Unknown'}
                                            </td>
                                            <td className='py-3 px-4 text-gray-500 text-xs'>
                                                {formatDate(scan.uploadedAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className='flex justify-between items-center bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                            <div className='text-gray-400'>
                                Page {page} of {totalPages}
                            </div>
                            <div className='flex gap-2'>
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className='px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className='px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <BackToTop />
            <Footer />
        </div>
    );
}
