'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingPage from '@/components/LoadingPage';
import { api } from '@/lib/api-client';
import { encodeHashForUrl } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/storage-constants';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { API_BASE_URL } from '@/lib/apiConfig';

interface Badge {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    requireTokenForUpdate: boolean;
    versionUpdateCount: number;
    linkedFile: {
        hash: string;
        fileName: string;
        score: number;
        lastScanned: string;
    };
}

interface ScanFile {
    id: number;
    fileName: string;
    score: number;
    isThreat: boolean;
    scanTimeMs: number;
    scanDate: string;
    fileHash?: string;
}

export default function BadgesPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t, locale } = useTranslation();
    const router = useRouter();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [scans, setScans] = useState<ScanFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingScans, setLoadingScans] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<
        'markdown' | 'html' | 'url' | 'verification' | 'rst' | 'asciidoc' | null
    >(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        title: string;
        message: string;
        action: () => void;
        type: 'danger' | 'warning';
        badgeName?: string;
    } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ScanFile | null>(null);
    const [badgeName, setBadgeName] = useState('');
    const [badgeDescription, setBadgeDescription] = useState('');
    const [enableAutoUpdate, setEnableAutoUpdate] = useState(false);
    const [creatingBadge, setCreatingBadge] = useState(false);
    const [newBadgeToken, setNewBadgeToken] = useState<string | null>(null);
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);
    const [regeneratingToken, setRegeneratingToken] = useState<string | null>(null);
    const [togglingAutoUpdate, setTogglingAutoUpdate] = useState<string | null>(null);
    const [deletingBadge, setDeletingBadge] = useState<string | null>(null);
    const [showAboutBadges, setShowAboutBadges] = useState(true);
    const [badgesExpanded, setBadgesExpanded] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const copyTokenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copyBadgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/badges');
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (isAuthenticated && user) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            fetchBadges(abortControllerRef.current.signal);
            fetchScans(abortControllerRef.current.signal);

            return () => {
                abortControllerRef.current?.abort();
                if (copyTokenTimeoutRef.current) {
                    clearTimeout(copyTokenTimeoutRef.current);
                }
                if (copyBadgeTimeoutRef.current) {
                    clearTimeout(copyBadgeTimeoutRef.current);
                }
            };
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        const dismissed = localStorage.getItem(STORAGE_KEYS.BADGES_ABOUT_DISMISSED);
        if (dismissed === 'true') {
            setShowAboutBadges(false);
        }
    }, []);

    const handleDismissAbout = () => {
        setShowAboutBadges(false);
        localStorage.setItem(STORAGE_KEYS.BADGES_ABOUT_DISMISSED, 'true');
    };

    const fetchBadges = async (signal?: AbortSignal) => {
        try {
            const data = await api.get<Badge[]>('badges', { signal });

            setBadges(prevBadges => {
                const badgesMap = new Map(prevBadges.map(b => [b.id, b]));

                return data.map((badge: Badge) => {
                    const existingBadge = badgesMap.get(badge.id);
                    return {
                        ...badge,
                        requireTokenForUpdate:
                            badge.requireTokenForUpdate ??
                            existingBadge?.requireTokenForUpdate ??
                            false,
                        versionUpdateCount:
                            badge.versionUpdateCount ?? existingBadge?.versionUpdateCount ?? 0,
                    } as Badge;
                });
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch badges:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchScans = async (signal?: AbortSignal) => {
        try {
            setLoadingScans(true);
            const data = await api.get<{ scans: ScanFile[] }>('users/me/scans?pageSize=50', {
                signal,
            });
            setScans(data.scans || []);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch scans:', error);
        } finally {
            setLoadingScans(false);
        }
    };

    const handleCreateBadge = async () => {
        if (!selectedFile || !selectedFile.fileHash) return;

        const trimmedName = badgeName.trim();
        const trimmedDescription = badgeDescription.trim();

        if (!trimmedName) {
            alert(t('badges.nameRequired') || 'Badge name is required');
            return;
        }

        if (trimmedName.length > 200) {
            alert(t('badges.nameTooLong') || 'Badge name cannot exceed 200 characters');
            return;
        }

        if (trimmedDescription && trimmedDescription.length > 500) {
            alert(t('badges.descriptionTooLong') || 'Description cannot exceed 500 characters');
            return;
        }

        const existingBadge = badges.find(b => b.linkedFile.hash === selectedFile.fileHash);
        if (existingBadge) {
            const confirmCreate = window.confirm(
                t('badges.duplicateWarning') +
                    ` "${existingBadge.name}". ` +
                    t('badges.duplicateConfirm')
            );
            if (!confirmCreate) return;
        }

        setCreatingBadge(true);

        try {
            let fileHash = selectedFile.fileHash;

            if (fileHash) {
                fileHash = fileHash.replace(/-/g, '+').replace(/_/g, '/');
                while (fileHash.length % 4) {
                    fileHash += '=';
                }
            }

            const badgeData = await api.post<Badge & { updateToken?: string }>('badges', {
                name: trimmedName,
                description: trimmedDescription || null,
                fileHash: fileHash,
                enableAutoUpdate: enableAutoUpdate,
            });

            setShowCreateModal(false);
            setSelectedFile(null);
            setBadgeName('');
            setBadgeDescription('');
            setEnableAutoUpdate(false);

            if (badgeData.updateToken) {
                setNewBadgeToken(badgeData.updateToken);
                setShowTokenModal(true);
            }

            setBadges(prevBadges => {
                const existingIndex = prevBadges.findIndex(b => b.id === badgeData.id);
                const newBadge: Badge = {
                    id: badgeData.id,
                    name: badgeData.name,
                    description: badgeData.description,
                    createdAt: badgeData.createdAt,
                    updatedAt: badgeData.updatedAt,
                    requireTokenForUpdate: badgeData.requireTokenForUpdate ?? false,
                    versionUpdateCount: badgeData.versionUpdateCount ?? 0,
                    linkedFile: badgeData.linkedFile,
                };

                if (existingIndex >= 0) {
                    const updated = [...prevBadges];
                    updated[existingIndex] = newBadge;
                    return updated;
                } else {
                    return [newBadge, ...prevBadges];
                }
            });
        } catch (error) {
            console.error('Failed to create badge:', error);
            alert(error instanceof Error ? error.message : t('badges.createFailed'));
        } finally {
            setCreatingBadge(false);
        }
    };

    const openCreateModal = (file: ScanFile) => {
        if (!file.fileHash) {
            alert(t('badges.noHash'));
            return;
        }
        setSelectedFile(file);
        setBadgeName(file.fileName.replace(/\.dll$/i, ''));
        setBadgeDescription('');
        setEnableAutoUpdate(false);
        setShowCreateModal(true);
    };

    const handleCopyToken = () => {
        if (newBadgeToken) {
            navigator.clipboard.writeText(newBadgeToken);
            setCopiedToken(true);
            if (copyTokenTimeoutRef.current) {
                clearTimeout(copyTokenTimeoutRef.current);
            }
            copyTokenTimeoutRef.current = setTimeout(() => {
                setCopiedToken(false);
                copyTokenTimeoutRef.current = null;
            }, 2000);
        }
    };

    const handleRegenerateToken = async (badgeId: string) => {
        setRegeneratingToken(badgeId);
        try {
            const data = await api.post<{ updateToken: string }>(
                `badges/${badgeId}/regenerate-token`
            );
            setNewBadgeToken(data.updateToken);
            setShowTokenModal(true);
            setConfirmDialog(null);
        } catch (error) {
            console.error('Failed to regenerate token:', error);
            alert(t('badges.regenerateFailed'));
        } finally {
            setRegeneratingToken(null);
        }
    };

    const requestRegenerateToken = (badgeId: string, badgeName: string) => {
        setConfirmDialog({
            show: true,
            title: t('badges.regenerateTokenConfirm.title'),
            message: t('badges.regenerateTokenConfirm.message', undefined, { badgeName }),
            type: 'warning',
            badgeName,
            action: () => handleRegenerateToken(badgeId),
        });
    };

    const handleToggleAutoUpdate = async (badgeId: string, currentStatus: boolean) => {
        setTogglingAutoUpdate(badgeId);
        try {
            const responseData = await api.post<Badge>(`badges/${badgeId}/toggle-auto-update`, {
                enabled: !currentStatus,
            });

            if (responseData && typeof responseData.requireTokenForUpdate === 'boolean') {
                setBadges(prevBadges => {
                    return prevBadges.map(badge =>
                        badge.id === badgeId
                            ? {
                                  ...badge,
                                  requireTokenForUpdate: responseData.requireTokenForUpdate,
                              }
                            : badge
                    );
                });
            }
        } catch (error) {
            console.error('Failed to toggle auto-update:', error);
            alert(error instanceof Error ? error.message : t('badges.toggleFailed'));
        } finally {
            setTogglingAutoUpdate(null);
        }
    };

    const handleCopyBadge = (
        badge: Badge,
        type: 'markdown' | 'html' | 'url' | 'verification' | 'rst' | 'asciidoc'
    ) => {
        let content = '';
        const badgeInfoUrl = `${window.location.origin}/badge/${badge.id}`;
        const badgeImageUrl = `${window.location.origin}/api/v1.0/badge/${badge.id}`;

        if (type === 'markdown') {
            content = `[![Safeturned](${badgeImageUrl})](${badgeInfoUrl})`;
        } else if (type === 'html') {
            content = `<a href="${badgeInfoUrl}"><img src="${badgeImageUrl}" alt="Safeturned" /></a>`;
        } else if (type === 'rst') {
            content = `.. image:: ${badgeImageUrl}\n   :target: ${badgeInfoUrl}\n   :alt: Safeturned`;
        } else if (type === 'asciidoc') {
            content = `image:${badgeImageUrl}[link="${badgeInfoUrl}",alt="Safeturned"]`;
        } else if (type === 'verification') {
            content = badgeInfoUrl;
        } else {
            content = badgeImageUrl;
        }

        navigator.clipboard.writeText(content);
        setCopiedId(badge.id);
        setCopiedType(type);
        if (copyBadgeTimeoutRef.current) {
            clearTimeout(copyBadgeTimeoutRef.current);
        }
        copyBadgeTimeoutRef.current = setTimeout(() => {
            setCopiedId(null);
            setCopiedType(null);
            copyBadgeTimeoutRef.current = null;
        }, 2000);
    };

    const handleDeleteBadge = async (badgeId: string) => {
        setDeletingBadge(badgeId);
        try {
            await api.delete(`badges/${badgeId}`);
            setBadges(prevBadges => prevBadges.filter(b => b.id !== badgeId));
            setConfirmDialog(null);
        } catch (error) {
            console.error('Failed to delete badge:', error);
            alert(t('badges.deleteFailed'));
        } finally {
            setDeletingBadge(null);
        }
    };

    const requestDeleteBadge = (badgeId: string, badgeName: string) => {
        setConfirmDialog({
            show: true,
            title: t('badges.deleteConfirm.title'),
            message: t('badges.deleteConfirm.message', undefined, { badgeName }),
            type: 'danger',
            badgeName,
            action: () => handleDeleteBadge(badgeId),
        });
    };

    const getRiskColor = (score: number) => {
        if (score >= 75) return 'text-red-400';
        if (score >= 50) return 'text-orange-400';
        if (score >= 25) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getRiskLabel = (score: number) => {
        if (score >= 75) return t('risk.highRisk');
        if (score >= 50) return t('risk.moderateRisk');
        if (score >= 25) return t('risk.lowRisk');
        return t('results.safe');
    };

    if (isLoading || !isAuthenticated || !user) {
        return <LoadingPage text={t('common.loading')} />;
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-7xl mx-auto px-6 py-12'>
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
                        <h1 className='text-4xl font-bold'>{t('badges.title')}</h1>
                    </div>
                    <p className='text-slate-400'>{t('badges.description')}</p>
                </div>

                {showAboutBadges && (
                    <div className='mb-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 relative'>
                        <button
                            onClick={handleDismissAbout}
                            className='absolute top-4 right-4 text-slate-400 hover:text-white transition-colors'
                            aria-label='Dismiss'
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
                        <div className='flex items-start gap-3'>
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
                            <div className='flex-1 pr-8'>
                                <h3 className='text-blue-400 font-semibold mb-3'>
                                    {t('badges.about')}
                                </h3>
                                <p className='text-slate-300 text-sm mb-3'>
                                    {t('badges.aboutDescription')}
                                </p>
                                <div className='bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 mb-3'>
                                    <h4 className='text-purple-300 font-semibold text-sm mb-2 flex items-center gap-2'>
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
                                                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                            />
                                        </svg>
                                        {t('badges.badgeBranding')}
                                    </h4>
                                    <p className='text-slate-300 text-sm mb-2'>
                                        {t('badges.badgeBrandingDescription')}
                                    </p>
                                </div>
                                <div className='bg-blue-900/30 border border-blue-500/20 rounded-lg p-4 mb-3'>
                                    <h4 className='text-blue-300 font-semibold text-sm mb-2'>
                                        {t('badges.security')}
                                    </h4>
                                    <p className='text-slate-300 text-sm mb-2'>
                                        {t('badges.securityDescription')}
                                    </p>
                                </div>
                                <div className='bg-green-900/20 border border-green-500/20 rounded-lg p-4'>
                                    <h4 className='text-green-300 font-semibold text-sm mb-2 flex items-center gap-2'>
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
                                        {t('badges.autoUpdateWithTokens')}
                                    </h4>
                                    <p className='text-slate-300 text-sm mb-3'>
                                        {t('badges.autoUpdateTokenDescription')}
                                    </p>
                                    <div className='bg-black/30 rounded-lg p-3 mb-2 border border-green-500/20'>
                                        <p className='text-green-200 text-xs font-semibold mb-2'>
                                            {t('badges.howToUseToken')}
                                        </p>
                                        <code className='text-green-300 text-xs block bg-slate-900/50 p-2 rounded mb-2 overflow-x-auto'>
                                            curl -X POST {API_BASE_URL}/v1.0/files \<br />
                                            &nbsp;&nbsp;-H &quot;Authorization: Bearer
                                            YOUR_API_KEY&quot; \
                                            <br />
                                            &nbsp;&nbsp;-F &quot;file=@plugin.dll&quot; \<br />
                                            &nbsp;&nbsp;-F &quot;badgeToken=YOUR_TOKEN_HERE&quot;
                                        </code>
                                        <p className='text-slate-400 text-xs'>
                                            {t('badges.tokenFieldDescription')}
                                        </p>
                                    </div>
                                    <p className='text-slate-400 text-xs mb-2'>
                                        {t('badges.perfectForCICD')}
                                    </p>
                                    <Link
                                        href='/docs#badge-tokens'
                                        className='text-blue-400 hover:text-blue-300 text-xs font-medium underline flex items-center gap-1'
                                    >
                                        <svg
                                            className='w-3 h-3'
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
                                        {t('badges.readFullDocumentation')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className='mb-6'>
                    <p className='text-slate-400 text-sm'>{t('badges.createFromResult')}</p>
                </div>

                {loading ? (
                    <div className='text-center py-12'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                        <p className='text-slate-300'>{t('badges.loading')}</p>
                    </div>
                ) : (
                    <>
                        {badges.length > 0 && (
                            <div className='mb-8'>
                                <button
                                    onClick={() => setBadgesExpanded(!badgesExpanded)}
                                    className='w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700 rounded-xl transition-colors mb-4'
                                >
                                    <h2 className='text-2xl font-bold text-white'>
                                        {t('badges.yourBadges')} ({badges.length})
                                    </h2>
                                    <svg
                                        className={`w-6 h-6 text-slate-400 transition-transform duration-200 ${badgesExpanded ? 'rotate-180' : ''}`}
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M19 9l-7 7-7-7'
                                        />
                                    </svg>
                                </button>
                                {badgesExpanded && (
                                    <div className='grid grid-cols-1 gap-6'>
                                        {badges.map(badge => (
                                            <div
                                                key={badge.id}
                                                className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-all duration-200'
                                            >
                                                <div className='flex flex-col gap-4'>
                                                    <div className='flex items-start justify-between gap-4'>
                                                        <div className='flex-1 min-w-0'>
                                                            <h3 className='text-xl font-bold text-white mb-2'>
                                                                {badge.name}
                                                            </h3>
                                                            {badge.description && (
                                                                <p className='text-slate-300 text-sm mb-3 leading-relaxed'>
                                                                    {badge.description}
                                                                </p>
                                                            )}
                                                            <div className='flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4'>
                                                                <span className='flex items-center gap-1.5'>
                                                                    <svg
                                                                        className='w-4 h-4 text-slate-400'
                                                                        fill='none'
                                                                        stroke='currentColor'
                                                                        viewBox='0 0 24 24'
                                                                    >
                                                                        <path
                                                                            strokeLinecap='round'
                                                                            strokeLinejoin='round'
                                                                            strokeWidth={2}
                                                                            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                                                                        />
                                                                    </svg>
                                                                    {formatDate(
                                                                        badge.createdAt,
                                                                        locale
                                                                    )}
                                                                </span>
                                                                {badge.versionUpdateCount > 0 && (
                                                                    <>
                                                                        <span className='text-slate-600'>
                                                                            •
                                                                        </span>
                                                                        <span className='flex items-center gap-1.5 text-purple-400 font-medium'>
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
                                                                                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                                                                />
                                                                            </svg>
                                                                            {
                                                                                badge.versionUpdateCount
                                                                            }{' '}
                                                                            {t('badges.updates')}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className='flex items-center gap-3'>
                                                                {badge.requireTokenForUpdate ? (
                                                                    <span className='inline-flex items-center gap-2 text-sm bg-green-900/30 text-green-300 px-3 py-2 rounded-lg border border-green-500/30 font-medium'>
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
                                                                                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                                                            />
                                                                        </svg>
                                                                        {t(
                                                                            'badges.autoUpdateEnabled'
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className='inline-flex items-center gap-2 text-sm bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 font-medium'>
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
                                                                                d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
                                                                            />
                                                                        </svg>
                                                                        {t(
                                                                            'badges.autoUpdateDisabled'
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className='flex flex-wrap gap-2'>
                                                        <Link
                                                            href={`/badge/${badge.id}`}
                                                            target='_blank'
                                                            className='bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-green-500/30 inline-flex items-center gap-1.5'
                                                        >
                                                            <svg
                                                                className='w-3.5 h-3.5'
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
                                                            {t('badges.viewInfo')}
                                                        </Link>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(
                                                                    badge,
                                                                    'verification'
                                                                )
                                                            }
                                                            className='bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-cyan-500/30 sm:min-w-[110px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'verification'
                                                                ? t('badges.copied')
                                                                : t('badges.verifyLink')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(badge, 'markdown')
                                                            }
                                                            className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-500/20 sm:min-w-[80px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'markdown'
                                                                ? t('badges.copied')
                                                                : t('badges.markdown')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(badge, 'html')
                                                            }
                                                            className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-500/20 sm:min-w-[80px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'html'
                                                                ? t('badges.copied')
                                                                : t('badges.html')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(badge, 'rst')
                                                            }
                                                            className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-500/20 sm:min-w-[80px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'rst'
                                                                ? t('badges.copied')
                                                                : t('badges.rst')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(badge, 'asciidoc')
                                                            }
                                                            className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-500/20 sm:min-w-[80px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'asciidoc'
                                                                ? t('badges.copied')
                                                                : t('badges.asciidoc')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleCopyBadge(badge, 'url')
                                                            }
                                                            className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-500/20 sm:min-w-[80px]'
                                                        >
                                                            {copiedId === badge.id &&
                                                            copiedType === 'url'
                                                                ? t('badges.copied')
                                                                : t('badges.directUrl')}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleToggleAutoUpdate(
                                                                    badge.id,
                                                                    badge.requireTokenForUpdate
                                                                )
                                                            }
                                                            disabled={
                                                                togglingAutoUpdate === badge.id
                                                            }
                                                            className='bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 disabled:opacity-50 sm:min-w-[120px]'
                                                        >
                                                            {togglingAutoUpdate === badge.id
                                                                ? t('common.loading')
                                                                : badge.requireTokenForUpdate
                                                                  ? t('badges.disableAutoUpdateBtn')
                                                                  : t('badges.enableAutoUpdateBtn')}
                                                        </button>
                                                        {badge.requireTokenForUpdate && (
                                                            <button
                                                                onClick={() =>
                                                                    requestRegenerateToken(
                                                                        badge.id,
                                                                        badge.name
                                                                    )
                                                                }
                                                                disabled={
                                                                    regeneratingToken === badge.id
                                                                }
                                                                className='bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-amber-500/30 disabled:opacity-50 sm:min-w-[120px]'
                                                            >
                                                                {t('badges.regenerateTokenBtn')}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                requestDeleteBadge(
                                                                    badge.id,
                                                                    badge.name
                                                                )
                                                            }
                                                            className='bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/30 sm:min-w-[70px]'
                                                        >
                                                            {t('badges.delete')}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className='mt-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700'>
                                                    <div className='flex items-center justify-between flex-wrap gap-4'>
                                                        <div className='flex-1 min-w-[200px]'>
                                                            <p className='text-sm text-slate-400 mb-2 font-medium'>
                                                                {t('badges.currentlyShowing')}
                                                            </p>
                                                            <p className='text-white font-semibold text-lg mb-1'>
                                                                {badge.linkedFile.fileName}
                                                            </p>
                                                            <p className='text-sm text-slate-400 flex items-center gap-1.5'>
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
                                                                {formatDateTime(
                                                                    badge.linkedFile.lastScanned,
                                                                    locale
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className='text-right'>
                                                            <p className='text-sm text-slate-400 mb-2 font-medium'>
                                                                {t('badges.riskScore')}
                                                            </p>
                                                            <p
                                                                className={`text-3xl font-bold ${getRiskColor(badge.linkedFile.score)} mb-1`}
                                                            >
                                                                {badge.linkedFile.score}/100
                                                            </p>
                                                            <p
                                                                className={`text-sm font-medium ${getRiskColor(badge.linkedFile.score)}`}
                                                            >
                                                                {getRiskLabel(
                                                                    badge.linkedFile.score
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className='mt-4 bg-slate-900/50 rounded-lg p-5 border border-slate-700'>
                                                    <p className='text-sm text-slate-400 mb-3 font-medium'>
                                                        {t('common.preview')}
                                                    </p>
                                                    <div className='flex items-center gap-4 flex-wrap'>
                                                        <Image
                                                            src={`/api/v1.0/badge/${badge.id}`}
                                                            alt={badge.name}
                                                            width={200}
                                                            height={20}
                                                            className='inline-block'
                                                            unoptimized
                                                            onError={e => {
                                                                const target =
                                                                    e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                        <span className='text-sm text-slate-400 font-mono'>
                                                            {badge.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={badges.length > 0 ? 'mt-8' : ''}>
                            {badges.length === 0 && (
                                <div className='mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center'>
                                    <h2 className='text-2xl font-bold text-white mb-2'>
                                        {t('badges.noBadges')}
                                    </h2>
                                    <p className='text-slate-400'>{t('badges.noBadgesDesc')}</p>
                                </div>
                            )}

                            {loadingScans ? (
                                <div className='text-center py-12'>
                                    <div className='inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                                    <p className='text-slate-300'>{t('badges.loadingFiles')}</p>
                                </div>
                            ) : scans.length === 0 ? (
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
                                                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                            />
                                        </svg>
                                    </div>
                                    <h2 className='text-2xl font-bold text-white mb-4'>
                                        {t('badges.noScannedFiles')}
                                    </h2>
                                    <p className='text-slate-400 mb-6'>
                                        {t('badges.noScannedFilesDesc')}
                                    </p>
                                    <Link
                                        href='/'
                                        className='inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                                    >
                                        {t('badges.scanFile')}
                                    </Link>
                                </div>
                            ) : (
                                <div>
                                    <h3 className='text-xl font-semibold text-white mb-4'>
                                        {badges.length > 0
                                            ? t('badges.createFromScanned')
                                            : t('badges.yourScannedFiles')}
                                    </h3>
                                    <div className='grid grid-cols-1 gap-4'>
                                        {scans.map(scan => (
                                            <div
                                                key={scan.id}
                                                className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-200'
                                            >
                                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                                    <div className='flex-1 min-w-[250px]'>
                                                        <h4 className='text-xl font-semibold text-white mb-3'>
                                                            {scan.fileName}
                                                        </h4>
                                                        <div className='flex flex-wrap items-center gap-3 text-sm text-slate-300'>
                                                            <span
                                                                className={`font-semibold ${getRiskColor(scan.score)} flex items-center gap-1.5`}
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
                                                                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                                                    />
                                                                </svg>
                                                                {scan.score}/100
                                                            </span>
                                                            <span className='text-slate-600'>
                                                                •
                                                            </span>
                                                            <span
                                                                className={`font-medium ${getRiskColor(scan.score)}`}
                                                            >
                                                                {getRiskLabel(scan.score)}
                                                            </span>
                                                            <span className='text-slate-600'>
                                                                •
                                                            </span>
                                                            <span className='flex items-center gap-1.5'>
                                                                <svg
                                                                    className='w-4 h-4 text-slate-400'
                                                                    fill='none'
                                                                    stroke='currentColor'
                                                                    viewBox='0 0 24 24'
                                                                >
                                                                    <path
                                                                        strokeLinecap='round'
                                                                        strokeLinejoin='round'
                                                                        strokeWidth={2}
                                                                        d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                                                                    />
                                                                </svg>
                                                                {formatDate(scan.scanDate, locale)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-3 flex-wrap'>
                                                        {scan.fileHash && (
                                                            <Link
                                                                href={`/result/${encodeHashForUrl(scan.fileHash)}`}
                                                                className='text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium underline underline-offset-2'
                                                            >
                                                                {t('badges.viewResult')}
                                                            </Link>
                                                        )}
                                                        {scan.fileHash ? (
                                                            <button
                                                                onClick={() =>
                                                                    openCreateModal(scan)
                                                                }
                                                                className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 text-sm shadow-lg shadow-purple-500/20'
                                                            >
                                                                {t('badges.createBadge')}
                                                            </button>
                                                        ) : (
                                                            <span className='text-slate-400 text-sm italic'>
                                                                {t('badges.hashUnavailable')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showTokenModal && newBadgeToken && (
                <div
                    className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) {
                            setShowTokenModal(false);
                            setNewBadgeToken(null);
                            setCopiedToken(false);
                        }
                    }}
                >
                    <div className='bg-slate-800 border border-amber-500/50 rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl'>
                        <div className='flex items-start gap-4 mb-6'>
                            <div className='w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                                <svg
                                    className='w-7 h-7 text-amber-400'
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
                            </div>
                            <div className='flex-1'>
                                <h3 className='text-2xl font-bold text-white mb-2'>
                                    {t('badges.updateToken')}
                                </h3>
                                <p className='text-base text-slate-300'>
                                    {t('badges.tokenWarning')}
                                </p>
                            </div>
                        </div>

                        <div className='bg-amber-900/20 border border-amber-500/30 rounded-lg p-5 mb-5'>
                            <p className='text-base text-amber-200 mb-4 leading-relaxed'>
                                {t('badges.tokenDescription')}
                            </p>
                            <div className='bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700'>
                                <code className='text-base text-green-400 break-all font-mono leading-relaxed'>
                                    {newBadgeToken}
                                </code>
                            </div>
                            <button
                                onClick={handleCopyToken}
                                className='w-full bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-lg text-base font-semibold transition-colors shadow-lg shadow-amber-500/20'
                            >
                                {copiedToken ? t('badges.copied') : t('badges.copyToken')}
                            </button>
                        </div>

                        <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6'>
                            <p className='text-sm text-red-300 leading-relaxed'>
                                {t('badges.tokenSecurityWarning')}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowTokenModal(false);
                                setNewBadgeToken(null);
                                setCopiedToken(false);
                            }}
                            className='w-full bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-lg font-semibold transition-colors text-base'
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}

            {showCreateModal && selectedFile && (
                <div
                    className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) {
                            setShowCreateModal(false);
                            setSelectedFile(null);
                            setBadgeName('');
                            setBadgeDescription('');
                        }
                    }}
                >
                    <div className='bg-slate-800 border border-purple-500/50 rounded-xl p-8 max-w-xl w-full mx-4 shadow-2xl'>
                        <h3 className='text-2xl font-bold mb-3 text-white'>
                            {t('badges.createBadge')}
                        </h3>
                        <p className='text-base text-slate-300 mb-6'>
                            {t('badges.createFor')}{' '}
                            <span className='font-semibold text-white'>
                                {selectedFile.fileName}
                            </span>
                        </p>

                        <div className='space-y-5'>
                            <div>
                                <label className='block text-base font-semibold text-slate-200 mb-2'>
                                    {t('badges.badgeName')} <span className='text-red-400'>*</span>
                                </label>
                                <input
                                    type='text'
                                    value={badgeName}
                                    onChange={e => setBadgeName(e.target.value)}
                                    placeholder={t('badges.namePlaceholder')}
                                    maxLength={200}
                                    className='w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'
                                    autoFocus
                                />
                                <p className='text-sm text-slate-400 mt-1.5'>
                                    {badgeName.length}/200
                                </p>
                            </div>

                            <div>
                                <label className='block text-base font-semibold text-slate-200 mb-2'>
                                    {t('badges.descriptionOptional')}
                                </label>
                                <textarea
                                    value={badgeDescription}
                                    onChange={e => setBadgeDescription(e.target.value)}
                                    placeholder={t('badges.descriptionPlaceholder')}
                                    maxLength={500}
                                    rows={3}
                                    className='w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all'
                                />
                                <p className='text-sm text-slate-400 mt-1.5'>
                                    {badgeDescription.length}/500
                                </p>
                            </div>

                            <div className='bg-blue-900/20 border border-blue-500/30 rounded-lg p-5'>
                                <div className='flex items-start gap-3'>
                                    <input
                                        type='checkbox'
                                        id='enableAutoUpdate'
                                        checked={enableAutoUpdate}
                                        onChange={e => setEnableAutoUpdate(e.target.checked)}
                                        className='mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer'
                                    />
                                    <div className='flex-1'>
                                        <label
                                            htmlFor='enableAutoUpdate'
                                            className='block text-base font-semibold text-blue-300 cursor-pointer mb-1'
                                        >
                                            {t('badges.enableAutoUpdate')}
                                        </label>
                                        <p className='text-sm text-slate-300 leading-relaxed'>
                                            {t('badges.autoUpdateDescription')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex gap-3 mt-8'>
                            <button
                                onClick={handleCreateBadge}
                                disabled={!badgeName.trim() || creatingBadge}
                                className='flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold text-white text-base transition-all duration-300 shadow-lg shadow-purple-500/20'
                            >
                                {creatingBadge ? t('badges.creating') : t('badges.createBadge')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setSelectedFile(null);
                                    setBadgeName('');
                                    setBadgeDescription('');
                                }}
                                disabled={creatingBadge}
                                className='px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-semibold text-white text-base transition-all duration-300'
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog && (
                <div
                    className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4'
                    onClick={e => {
                        if (e.target === e.currentTarget) {
                            setConfirmDialog(null);
                        }
                    }}
                >
                    <div className='bg-slate-800 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl'>
                        <h3
                            className={`text-xl font-bold mb-3 ${confirmDialog.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}
                        >
                            {confirmDialog.title}
                        </h3>
                        <p className='text-gray-300 mb-6 leading-relaxed'>
                            {confirmDialog.message}
                        </p>
                        <div className='flex gap-3 justify-end'>
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className='px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors'
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDialog.action}
                                disabled={deletingBadge !== null || regeneratingToken !== null}
                                className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                    confirmDialog.type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                }`}
                            >
                                {deletingBadge !== null || regeneratingToken !== null
                                    ? t('common.loading')
                                    : confirmDialog.type === 'danger'
                                      ? t('badges.delete')
                                      : t('badges.regenerateToken')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BackToTop />
            <Footer />
        </div>
    );
}
