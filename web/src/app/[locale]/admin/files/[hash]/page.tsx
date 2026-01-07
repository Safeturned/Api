'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api-client';
import { AdminVerdict, VERDICT_LABELS } from '@/lib/adminConstants';
import { encodeHashForUrl, decodeHashFromUrl } from '@/lib/utils';

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

interface FileReview {
    id: string;
    verdict: string;
    publicMessage: string | null;
    internalNotes: string | null;
    reviewedAt: string;
    reviewer: {
        id: string;
        username: string | null;
    };
}

interface FileData {
    hash: string;
    fileName: string | null;
    score: number;
    sizeBytes: number;
    lastScanned: string;
    analyzerVersion: string | null;
    isTakenDown: boolean;
    takenDownAt: string | null;
    takenDownReason: string | null;
    currentVerdict: string | null;
    publicMessage: string | null;
    assemblyInfo: {
        company: string | null;
        product: string | null;
        title: string | null;
        guid: string | null;
        copyright: string | null;
    } | null;
    uploadedBy: {
        userId: string | null;
        username: string | null;
    } | null;
    takenDownBy: string | null;
    reviewHistory: FileReview[];
}

export default function AdminFileDetailPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const hash = params.hash as string;
    const apiHash = decodeHashFromUrl(hash);

    const [fileData, setFileData] = useState<FileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState<{
        verdict: number;
        publicMessage: string;
        internalNotes: string;
    }>({
        verdict: AdminVerdict.None,
        publicMessage: '',
        internalNotes: '',
    });

    const [showTakedownModal, setShowTakedownModal] = useState(false);
    const [takedownForm, setTakedownForm] = useState({
        reason: '',
        publicMessage: '',
    });

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreForm, setRestoreForm] = useState({
        internalNotes: '',
    });

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadFile = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get<FileData>(`admin/files/${apiHash}`);
            setFileData(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin.fileModeration.failedToLoad', 'Failed to load file')
            );
        } finally {
            setLoading(false);
        }
    }, [hash, t]);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            router.push('/');
            return;
        }

        if (user?.isAdmin && hash) {
            loadFile();
        }
    }, [user, isAuthenticated, isLoading, router, hash, loadFile]);

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

    const handleAddReview = async () => {
        try {
            setActionLoading('review');
            await api.post(`admin/files/${apiHash}/reviews`, {
                verdict: reviewForm.verdict,
                publicMessage: reviewForm.publicMessage || null,
                internalNotes: reviewForm.internalNotes || null,
            });
            setSuccessMessage(t('admin.fileModeration.reviewAdded', 'Review added successfully'));
            setShowReviewModal(false);
            setReviewForm({ verdict: AdminVerdict.None, publicMessage: '', internalNotes: '' });
            await loadFile();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin.fileModeration.reviewFailed', 'Failed to add review')
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleTakedown = async () => {
        if (!takedownForm.reason.trim()) {
            setError(t('admin.fileModeration.reasonRequired', 'Reason is required'));
            return;
        }

        try {
            setActionLoading('takedown');
            await api.post(`admin/files/${apiHash}/takedown`, {
                reason: takedownForm.reason,
                publicMessage: takedownForm.publicMessage || null,
            });
            setSuccessMessage(
                t('admin.fileModeration.takenDownSuccess', 'File taken down successfully')
            );
            setShowTakedownModal(false);
            setTakedownForm({ reason: '', publicMessage: '' });
            await loadFile();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin.fileModeration.takedownFailed', 'Failed to take down file')
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async () => {
        try {
            setActionLoading('restore');
            await api.post(`admin/files/${apiHash}/restore`, {
                internalNotes: restoreForm.internalNotes || null,
            });
            setSuccessMessage(
                t('admin.fileModeration.restoredSuccess', 'File restored successfully')
            );
            setShowRestoreModal(false);
            setRestoreForm({ internalNotes: '' });
            await loadFile();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('admin.fileModeration.restoreFailed', 'Failed to restore file')
            );
        } finally {
            setActionLoading(null);
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

    if (error && !fileData) {
        return (
            <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
                <Navigation />
                <div className='flex-1 flex items-center justify-center'>
                    <div className='text-center'>
                        <p className='text-red-400 text-xl mb-4'>{error}</p>
                        <Link href='/admin/files' className='text-purple-400 hover:text-purple-300'>
                            {t('admin.fileModeration.backToList', '← Back to Files')}
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
            <Navigation />
            <div className='flex-1 px-6 py-8'>
                <div className='max-w-6xl mx-auto'>
                    <div className='mb-8'>
                        <Link
                            href='/admin/files'
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
                            {t('admin.fileModeration.backToList', 'Back to Files')}
                        </Link>
                        <h1 className='text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1'>
                            {t('admin.fileModeration.fileDetails', 'File Details')}
                        </h1>
                    </div>

                    {error && (
                        <div className='bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6'>
                            <p className='text-red-300'>{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className='text-red-400 text-sm mt-2 hover:underline'
                            >
                                {t('common.close', 'Dismiss')}
                            </button>
                        </div>
                    )}

                    {fileData && (
                        <div className='space-y-6'>
                            {fileData.isTakenDown && (
                                <div className='bg-red-900/30 border border-red-500/50 rounded-xl p-6'>
                                    <div className='flex items-center gap-3 mb-3'>
                                        <svg
                                            className='w-8 h-8 text-red-400'
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
                                        <h2 className='text-2xl font-bold text-red-400'>
                                            {t(
                                                'admin.fileModeration.fileTakenDown',
                                                'This File Has Been Taken Down'
                                            )}
                                        </h2>
                                    </div>
                                    {fileData.takenDownReason && (
                                        <p className='text-gray-300 mb-2'>
                                            <span className='text-gray-400'>
                                                {t('admin.fileModeration.reason', 'Reason')}:
                                            </span>{' '}
                                            {fileData.takenDownReason}
                                        </p>
                                    )}
                                    {fileData.takenDownBy && (
                                        <p className='text-gray-400 text-sm'>
                                            {t('admin.fileModeration.takenDownBy', 'Taken down by')}{' '}
                                            {fileData.takenDownBy || 'Unknown'}
                                            {fileData.takenDownAt &&
                                                ` on ${formatDate(fileData.takenDownAt)}`}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setShowRestoreModal(true)}
                                        disabled={actionLoading === 'restore'}
                                        className='mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
                                    >
                                        {actionLoading === 'restore'
                                            ? t('common.loading', 'Loading...')
                                            : t('admin.fileModeration.restoreFile', 'Restore File')}
                                    </button>
                                </div>
                            )}

                            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                                <div className='lg:col-span-2 space-y-6'>
                                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                        <h2 className='text-xl font-semibold text-white mb-4'>
                                            {t('admin.fileModeration.fileInfo', 'File Information')}
                                        </h2>
                                        <div className='grid grid-cols-2 gap-4'>
                                            <div>
                                                <p className='text-gray-400 text-sm'>
                                                    {t(
                                                        'admin.fileModeration.fileName',
                                                        'File Name'
                                                    )}
                                                </p>
                                                <p className='text-white font-medium'>
                                                    {fileData.fileName || 'Unknown'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-gray-400 text-sm'>
                                                    {t(
                                                        'admin.fileModeration.fileSize',
                                                        'File Size'
                                                    )}
                                                </p>
                                                <p className='text-white'>
                                                    {formatFileSize(fileData.sizeBytes)}
                                                </p>
                                            </div>
                                            <div className='col-span-2'>
                                                <p className='text-gray-400 text-sm'>
                                                    {t('admin.fileModeration.hash', 'SHA-256 Hash')}
                                                </p>
                                                <p className='text-white font-mono text-sm break-all'>
                                                    {fileData.hash}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-gray-400 text-sm'>
                                                    {t(
                                                        'admin.fileModeration.score',
                                                        'Security Score'
                                                    )}
                                                </p>
                                                <p
                                                    className={`text-2xl font-bold ${getScoreColor(fileData.score)}`}
                                                >
                                                    {fileData.score}/100
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-gray-400 text-sm'>
                                                    {t(
                                                        'admin.fileModeration.lastScanned',
                                                        'Last Scanned'
                                                    )}
                                                </p>
                                                <p className='text-white'>
                                                    {formatDate(fileData.lastScanned)}
                                                </p>
                                            </div>
                                            {fileData.analyzerVersion && (
                                                <div>
                                                    <p className='text-gray-400 text-sm'>
                                                        {t(
                                                            'admin.fileModeration.analyzerVersion',
                                                            'Analyzer Version'
                                                        )}
                                                    </p>
                                                    <p className='text-white font-mono text-sm'>
                                                        {fileData.analyzerVersion}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className='text-gray-400 text-sm'>
                                                    {t('admin.fileModeration.uploader', 'Uploader')}
                                                </p>
                                                <p className='text-white'>
                                                    {fileData.uploadedBy?.username || 'Anonymous'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {(fileData.assemblyInfo?.company ||
                                        fileData.assemblyInfo?.product ||
                                        fileData.assemblyInfo?.title) && (
                                        <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                            <h2 className='text-xl font-semibold text-white mb-4'>
                                                {t(
                                                    'admin.fileModeration.assemblyInfo',
                                                    'Assembly Metadata'
                                                )}
                                            </h2>
                                            <div className='grid grid-cols-2 gap-4'>
                                                {fileData.assemblyInfo?.title && (
                                                    <div>
                                                        <p className='text-gray-400 text-sm'>
                                                            {t(
                                                                'admin.fileModeration.assemblyTitle',
                                                                'Title'
                                                            )}
                                                        </p>
                                                        <p className='text-white'>
                                                            {fileData.assemblyInfo.title}
                                                        </p>
                                                    </div>
                                                )}
                                                {fileData.assemblyInfo?.company && (
                                                    <div>
                                                        <p className='text-gray-400 text-sm'>
                                                            {t(
                                                                'admin.fileModeration.company',
                                                                'Company'
                                                            )}
                                                        </p>
                                                        <p className='text-white'>
                                                            {fileData.assemblyInfo.company}
                                                        </p>
                                                    </div>
                                                )}
                                                {fileData.assemblyInfo?.product && (
                                                    <div>
                                                        <p className='text-gray-400 text-sm'>
                                                            {t(
                                                                'admin.fileModeration.product',
                                                                'Product'
                                                            )}
                                                        </p>
                                                        <p className='text-white'>
                                                            {fileData.assemblyInfo.product}
                                                        </p>
                                                    </div>
                                                )}
                                                {fileData.assemblyInfo?.copyright && (
                                                    <div>
                                                        <p className='text-gray-400 text-sm'>
                                                            {t(
                                                                'admin.fileModeration.copyright',
                                                                'Copyright'
                                                            )}
                                                        </p>
                                                        <p className='text-white'>
                                                            {fileData.assemblyInfo.copyright}
                                                        </p>
                                                    </div>
                                                )}
                                                {fileData.assemblyInfo?.guid && (
                                                    <div className='col-span-2'>
                                                        <p className='text-gray-400 text-sm'>
                                                            {t('admin.fileModeration.guid', 'GUID')}
                                                        </p>
                                                        <p className='text-white font-mono text-sm'>
                                                            {fileData.assemblyInfo.guid}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                        <div className='flex items-center justify-between mb-4'>
                                            <h2 className='text-xl font-semibold text-white'>
                                                {t(
                                                    'admin.fileModeration.reviewHistory',
                                                    'Review History'
                                                )}
                                            </h2>
                                            <button
                                                onClick={() => setShowReviewModal(true)}
                                                className='bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm inline-flex items-center gap-2'
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
                                                        d='M12 4v16m8-8H4'
                                                    />
                                                </svg>
                                                {t('admin.fileModeration.addReview', 'Add Review')}
                                            </button>
                                        </div>

                                        {fileData.reviewHistory &&
                                        fileData.reviewHistory.length > 0 ? (
                                            <div className='space-y-4'>
                                                {fileData.reviewHistory.map(review => (
                                                    <div
                                                        key={review.id}
                                                        className='bg-slate-700/30 border border-slate-600/50 rounded-lg p-4'
                                                    >
                                                        <div className='flex items-start justify-between mb-3'>
                                                            <div className='flex items-center gap-3'>
                                                                <span
                                                                    className={`${getVerdictColorByName(review.verdict)} text-white text-xs px-2 py-1 rounded font-medium`}
                                                                >
                                                                    {getVerdictLabelByName(review.verdict)}
                                                                </span>
                                                                <span className='text-gray-400 text-sm'>
                                                                    by{' '}
                                                                    {review.reviewer?.username ||
                                                                        'Unknown'}
                                                                </span>
                                                            </div>
                                                            <span className='text-gray-500 text-sm'>
                                                                {formatDate(review.reviewedAt)}
                                                            </span>
                                                        </div>
                                                        {review.publicMessage && (
                                                            <div className='mb-2'>
                                                                <p className='text-gray-400 text-xs mb-1'>
                                                                    {t(
                                                                        'admin.fileModeration.publicMessage',
                                                                        'Public Message'
                                                                    )}
                                                                    :
                                                                </p>
                                                                <p className='text-white text-sm'>
                                                                    {review.publicMessage}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {review.internalNotes && (
                                                            <div className='bg-yellow-900/20 border border-yellow-600/30 rounded p-2'>
                                                                <p className='text-yellow-400 text-xs mb-1'>
                                                                    {t(
                                                                        'admin.fileModeration.internalNotes',
                                                                        'Internal Notes'
                                                                    )}
                                                                    :
                                                                </p>
                                                                <p className='text-yellow-200 text-sm'>
                                                                    {review.internalNotes}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='text-gray-400 text-center py-8'>
                                                {t(
                                                    'admin.fileModeration.noReviews',
                                                    'No reviews yet'
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='space-y-6'>
                                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                        <h2 className='text-xl font-semibold text-white mb-4'>
                                            {t(
                                                'admin.fileModeration.currentStatus',
                                                'Current Status'
                                            )}
                                        </h2>
                                        <div className='space-y-4'>
                                            <div>
                                                <p className='text-gray-400 text-sm mb-2'>
                                                    {t('admin.fileModeration.verdict', 'Verdict')}
                                                </p>
                                                <span
                                                    className={`${getVerdictColorByName(fileData.currentVerdict)} text-white px-3 py-1.5 rounded-lg font-medium inline-block`}
                                                >
                                                    {getVerdictLabelByName(fileData.currentVerdict)}
                                                </span>
                                            </div>
                                            {fileData.publicMessage && (
                                                <div>
                                                    <p className='text-gray-400 text-sm mb-2'>
                                                        {t(
                                                            'admin.fileModeration.publicMessage',
                                                            'Public Message'
                                                        )}
                                                    </p>
                                                    <p className='text-white bg-slate-700/50 rounded-lg p-3 text-sm'>
                                                        {fileData.publicMessage}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6'>
                                        <h2 className='text-xl font-semibold text-white mb-4'>
                                            {t('admin.fileModeration.actions', 'Actions')}
                                        </h2>
                                        <div className='space-y-3'>
                                            <button
                                                onClick={() => setShowReviewModal(true)}
                                                className='w-full bg-purple-600/20 border border-purple-600/50 text-purple-300 px-4 py-3 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-2'
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
                                                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                                    />
                                                </svg>
                                                {t('admin.fileModeration.addReview', 'Add Review')}
                                            </button>

                                            {!fileData.isTakenDown ? (
                                                <button
                                                    onClick={() => setShowTakedownModal(true)}
                                                    className='w-full bg-red-600/20 border border-red-600/50 text-red-300 px-4 py-3 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2'
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
                                                            d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
                                                        />
                                                    </svg>
                                                    {t(
                                                        'admin.fileModeration.takedownFile',
                                                        'Take Down File'
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setShowRestoreModal(true)}
                                                    className='w-full bg-green-600/20 border border-green-600/50 text-green-300 px-4 py-3 rounded-lg hover:bg-green-600/30 transition-colors flex items-center justify-center gap-2'
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
                                                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                                        />
                                                    </svg>
                                                    {t(
                                                        'admin.fileModeration.restoreFile',
                                                        'Restore File'
                                                    )}
                                                </button>
                                            )}

                                            <Link
                                                href={`/result/${encodeHashForUrl(fileData.hash)}`}
                                                target='_blank'
                                                className='w-full bg-slate-600/20 border border-slate-600/50 text-gray-300 px-4 py-3 rounded-lg hover:bg-slate-600/30 transition-colors flex items-center justify-center gap-2'
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
                                                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                                    />
                                                </svg>
                                                {t(
                                                    'admin.fileModeration.viewPublicPage',
                                                    'View Public Page'
                                                )}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <BackToTop />
            <Footer />

            {showReviewModal && (
                <div
                    className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) setShowReviewModal(false);
                    }}
                >
                    <div className='bg-slate-800 border border-purple-500/30 rounded-xl p-6 max-w-lg w-full shadow-2xl'>
                        <h3 className='text-xl font-bold text-purple-400 mb-4'>
                            {t('admin.fileModeration.addReviewTitle', 'Add Review')}
                        </h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.verdict', 'Verdict')} *
                                </label>
                                <select
                                    value={reviewForm.verdict}
                                    onChange={e =>
                                        setReviewForm({
                                            ...reviewForm,
                                            verdict: parseInt(e.target.value),
                                        })
                                    }
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                >
                                    {Object.entries(VERDICT_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.publicMessage', 'Public Message')}
                                </label>
                                <textarea
                                    value={reviewForm.publicMessage}
                                    onChange={e =>
                                        setReviewForm({
                                            ...reviewForm,
                                            publicMessage: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        'admin.fileModeration.publicMessagePlaceholder',
                                        'Message visible to users...'
                                    )}
                                    rows={3}
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.internalNotes', 'Internal Notes')}
                                </label>
                                <textarea
                                    value={reviewForm.internalNotes}
                                    onChange={e =>
                                        setReviewForm({
                                            ...reviewForm,
                                            internalNotes: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        'admin.fileModeration.internalNotesPlaceholder',
                                        'Notes visible only to admins...'
                                    )}
                                    rows={3}
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none'
                                />
                            </div>
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className='flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-colors'
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleAddReview}
                                disabled={actionLoading === 'review'}
                                className='flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50'
                            >
                                {actionLoading === 'review'
                                    ? t('common.loading', 'Loading...')
                                    : t('admin.fileModeration.submitReview', 'Submit Review')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTakedownModal && (
                <div
                    className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) setShowTakedownModal(false);
                    }}
                >
                    <div className='bg-slate-800 border border-red-500/30 rounded-xl p-6 max-w-lg w-full shadow-2xl'>
                        <h3 className='text-xl font-bold text-red-400 mb-4'>
                            {t('admin.fileModeration.takedownTitle', 'Take Down File')}
                        </h3>
                        <p className='text-gray-300 mb-4'>
                            {t(
                                'admin.fileModeration.takedownWarning',
                                'This will hide the file from public view. Users will see a takedown notice instead of the file details.'
                            )}
                        </p>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.reason', 'Reason')} *
                                </label>
                                <textarea
                                    value={takedownForm.reason}
                                    onChange={e =>
                                        setTakedownForm({ ...takedownForm, reason: e.target.value })
                                    }
                                    placeholder={t(
                                        'admin.fileModeration.reasonPlaceholder',
                                        'Internal reason for takedown...'
                                    )}
                                    rows={3}
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.publicMessage', 'Public Message')}
                                </label>
                                <textarea
                                    value={takedownForm.publicMessage}
                                    onChange={e =>
                                        setTakedownForm({
                                            ...takedownForm,
                                            publicMessage: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        'admin.fileModeration.publicMessagePlaceholder',
                                        'Message visible to users...'
                                    )}
                                    rows={2}
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none'
                                />
                            </div>
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowTakedownModal(false)}
                                className='flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-colors'
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleTakedown}
                                disabled={
                                    actionLoading === 'takedown' || !takedownForm.reason.trim()
                                }
                                className='flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50'
                            >
                                {actionLoading === 'takedown'
                                    ? t('common.loading', 'Loading...')
                                    : t('admin.fileModeration.confirmTakedown', 'Take Down')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRestoreModal && (
                <div
                    className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) setShowRestoreModal(false);
                    }}
                >
                    <div className='bg-slate-800 border border-green-500/30 rounded-xl p-6 max-w-lg w-full shadow-2xl'>
                        <h3 className='text-xl font-bold text-green-400 mb-4'>
                            {t('admin.fileModeration.restoreTitle', 'Restore File')}
                        </h3>
                        <p className='text-gray-300 mb-4'>
                            {t(
                                'admin.fileModeration.restoreWarning',
                                'This will make the file publicly visible again.'
                            )}
                        </p>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                    {t('admin.fileModeration.internalNotes', 'Internal Notes')}
                                </label>
                                <textarea
                                    value={restoreForm.internalNotes}
                                    onChange={e =>
                                        setRestoreForm({
                                            ...restoreForm,
                                            internalNotes: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        'admin.fileModeration.restoreNotesPlaceholder',
                                        'Reason for restoring...'
                                    )}
                                    rows={3}
                                    className='w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 resize-none'
                                />
                            </div>
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className='flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-colors'
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={actionLoading === 'restore'}
                                className='flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50'
                            >
                                {actionLoading === 'restore'
                                    ? t('common.loading', 'Loading...')
                                    : t('admin.fileModeration.confirmRestore', 'Restore')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
