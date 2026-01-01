'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import LoadingPage from '@/components/LoadingPage';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import Image from 'next/image';
import { formatFileSize, getRiskLevel, getRiskColor, encodeHashForUrl } from '@/lib/utils';
import DynamicMetaTags from '@/components/DynamicMetaTags';
import { api } from '@/lib/api-client';

interface AnalyticsData {
    fileName: string;
    score: number;
    checked: string[];
    messageType: string;
    lastScanned: string;
    fileSizeBytes: number;
    analyzerVersion?: string;
    assemblyCompany?: string;
    assemblyProduct?: string;
    assemblyTitle?: string;
    assemblyGuid?: string;
    assemblyCopyright?: string;
}

interface SecurityCheck {
    name: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    icon: string;
}

const BLACKLISTED_COMMANDS_MAP: Record<string, SecurityCheck> = {
    admin: {
        name: 'Admin Command Detection',
        description:
            'Plugin attempts to execute the "admin" command via Rocket Console, which grants administrator privileges. This is a critical security risk as plugins should not modify user permissions.',
        severity: 'high',
        icon: '🚨',
    },
    shutdown: {
        name: 'Shutdown Command Detection',
        description:
            'Plugin attempts to execute the "shutdown" command via Rocket Console, which can forcefully stop the server. This could be used for griefing or denial of service.',
        severity: 'high',
        icon: '⛔',
    },
    ban: {
        name: 'Ban Command Detection',
        description:
            'Plugin attempts to execute the "ban" command via Rocket Console, which can ban players without proper authorization. This could be abused for unfair moderation.',
        severity: 'medium',
        icon: '🔨',
    },
};

function getSecurityCheckInfo(checkText: string): SecurityCheck {
    const lowerCheck = checkText.toLowerCase();

    for (const [command, check] of Object.entries(BLACKLISTED_COMMANDS_MAP)) {
        if (lowerCheck.includes(command)) {
            return check;
        }
    }

    return {
        name: 'Security Finding',
        description: checkText,
        severity: 'medium',
        icon: '⚠️',
    };
}

export default function ResultPage() {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const params = useParams();
    const router = useRouter();
    const hash = params.hash as string;
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchHash, setSearchHash] = useState(hash);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragFile, setDragFile] = useState<File | null>(null);
    const [showDragUpload, setShowDragUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);
    const [useChunkedUploadForFile, setUseChunkedUploadForFile] = useState(false);
    const [securityAnalysisExpanded, setSecurityAnalysisExpanded] = useState(true);
    const [badgeEmbedExpanded, setBadgeEmbedExpanded] = useState(false);
    const [assemblyMetadataExpanded, setAssemblyMetadataExpanded] = useState(false);
    const [isFileStored, setIsFileStored] = useState<boolean | null>(null);
    const [showReanalyzeTooltip, setShowReanalyzeTooltip] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    const CHUNKED_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

    const chunkedUpload = useChunkedUpload({
        onComplete: (result: Record<string, unknown>) => {
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('uploadResult', JSON.stringify(result));
            }

            let hash;
            if (result.id) {
                hash = result.id;
            } else if (result.fileHash && typeof result.fileHash === 'string') {
                hash = encodeHashForUrl(result.fileHash);
            } else if (result.hash && typeof result.hash === 'string') {
                hash = result.hash;
            } else {
                hash = Date.now().toString();
            }

            if (hash === params.hash) {
                if (typeof window !== 'undefined') {
                    window.location.reload();
                }
            } else {
                router.push(`/result/${hash}`);
            }
        },
        onError: (error: string) => {
            setNotification({ message: error, type: 'error' });
            setIsUploading(false);
        },
    });

    useEffect(() => {
        if (hash) {
            if (typeof window !== 'undefined') {
                const uploadResult = sessionStorage.getItem('uploadResult');
                if (uploadResult) {
                    try {
                        const data = JSON.parse(uploadResult);
                        setAnalyticsData(data);
                        setLoading(false);
                        sessionStorage.removeItem('uploadResult');
                        return;
                    } catch (err) {
                        console.error('Failed to parse upload result:', err);
                        sessionStorage.removeItem('uploadResult');
                    }
                }
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            fetchAnalysisResult(hash, abortControllerRef.current.signal);

            return () => {
                abortControllerRef.current?.abort();
            };
        }
    }, [hash]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const checkFileStorage = async () => {
            if (!hash) return;

            try {
                const response = await api.post<{ isStored: boolean }>('/api/check-file-storage', {
                    fileHash: hash,
                });
                setIsFileStored(response?.isStored ?? false);
            } catch (error) {
                console.error('Failed to check file storage:', error);
                setIsFileStored(false);
            }
        };

        checkFileStorage();
    }, [hash]);

    useEffect(() => {
        const fetchLatestVersion = async () => {
            try {
                const data = await api.get<{ version: string }>('/api/analyzer/version');
                setLatestVersion(data.version);
            } catch (error) {
                console.error('Failed to fetch latest analyzer version:', error);
            }
        };

        fetchLatestVersion();
    }, []);

    const compareVersions = (v1: string, v2: string): number => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const diff = (parts1[i] || 0) - (parts2[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    };

    const isOutdated = useMemo(() => {
        if (!latestVersion || !analyticsData?.analyzerVersion) return false;
        return compareVersions(analyticsData.analyzerVersion, latestVersion) < 0;
    }, [latestVersion, analyticsData?.analyzerVersion]);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            if (file.name.toLowerCase().endsWith('.dll')) {
                if (file.size > MAX_FILE_SIZE) {
                    setNotification({ message: t('errors.fileTooLarge'), type: 'error' });
                    return;
                }
                setDragFile(file);
                setUseChunkedUploadForFile(file.size > CHUNKED_UPLOAD_THRESHOLD);
                setShowDragUpload(true);
                setError(null);
            } else {
                setNotification({ message: t('common.pleaseSelectDll'), type: 'error' });
            }
        }
    };

    async function computeFileHash(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const bytes = Array.from(new Uint8Array(hashBuffer));
        const base64 = btoa(String.fromCharCode(...bytes));
        return base64;
    }

    const handleDragUpload = async () => {
        if (!dragFile || isUploading) return;

        setIsUploading(true);
        setError(null);

        try {
            if (useChunkedUploadForFile) {
                await chunkedUpload.uploadFile(dragFile);
            } else {
                const formData = new FormData();
                formData.append('file', dragFile, dragFile.name);

                const result = (await api.post('/api/upload', formData)) as {
                    id?: string;
                    fileHash?: string;
                    hash?: string;
                };

                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('uploadResult', JSON.stringify(result));
                }

                let hash: string;
                if (result.id) {
                    hash = result.id;
                } else if (result.fileHash) {
                    hash = encodeHashForUrl(result.fileHash);
                } else if (result.hash) {
                    hash = result.hash;
                } else {
                    hash = await computeFileHash(dragFile);
                    hash = encodeHashForUrl(hash);
                }

                if (hash === params.hash) {
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('uploadResult', JSON.stringify(result));
                    }
                    if (typeof window !== 'undefined') {
                        window.location.reload();
                    }
                } else {
                    router.push(`/result/${hash}`);
                }
            }
            return;
        } catch (err) {
            console.error('Upload failed:', err);
            setNotification({
                message: err instanceof Error ? err.message : 'Unknown error occurred',
                type: 'error',
            });
        } finally {
            setIsUploading(false);
            setShowDragUpload(false);
            setDragFile(null);
        }
    };

    const handleCancelDragUpload = () => {
        setDragFile(null);
        setShowDragUpload(false);
    };

    const handleShare = async () => {
        if (!analyticsData) return;

        let shareText = '';
        let shareTitle = '';

        if (analyticsData.score >= 80) {
            shareTitle = `HIGH RISK: ${analyticsData.fileName} - Scan Result`;
            shareText = `Security Alert: "${analyticsData.fileName}" - HIGH RISK detected (${analyticsData.score}/100)\n\nThis file shows signs of malicious behavior and should not be used. Scan verified by Safeturned malware detection.`;
        } else if (analyticsData.score >= 60) {
            shareTitle = `SUSPICIOUS: ${analyticsData.fileName} - Scan Result`;
            shareText = `Warning: "${analyticsData.fileName}" - Suspicious activity detected (${analyticsData.score}/100)\n\nThis file exhibits potentially unsafe behavior. Use with caution. Scanned by Safeturned.`;
        } else if (analyticsData.score >= 30) {
            shareTitle = `Minor Concerns: ${analyticsData.fileName} - Scan Result`;
            shareText = `"${analyticsData.fileName}" - Minor concerns (${analyticsData.score}/100)\n\nThis file is mostly safe but has some minor flags. Review recommended before use.`;
        } else {
            shareTitle = `CLEAN: ${analyticsData.fileName} - Scan Result`;
            shareText = `"${analyticsData.fileName}" - Clean scan result (${analyticsData.score}/100)\n\nNo malicious behavior detected. This file appears safe to use. Verified by Safeturned.`;
        }

        try {
            if (typeof window !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: window.location.href,
                });
            } else {
                await handleCopyLink();
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setNotification({ message: t('common.shareFailed'), type: 'error' });
            }
        }
    };

    const handleCopyLink = async () => {
        try {
            if (typeof window !== 'undefined') {
                await navigator.clipboard.writeText(window.location.href);
                setNotification({ message: t('results.linkCopied'), type: 'success' });
            }
        } catch (err) {
            console.error('Failed to copy link:', err);
            setNotification({ message: t('common.copyLinkFailed'), type: 'error' });
        }
    };

    const handleReanalyze = async () => {
        if (!analyticsData || isReanalyzing) return;

        setIsReanalyzing(true);
        setError(null);

        try {
            const result = await api.post<AnalyticsData>('/api/reanalyze', {
                fileHash: hash,
                forceAnalyze: true,
            });

            setAnalyticsData(result);
            setNotification({
                message: t('results.reanalysisSuccess'),
                type: 'success',
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                try {
                    const errorData = JSON.parse(err.message);
                    if (errorData.error === 'FILE_NOT_STORED') {
                        setNotification({
                            message: errorData.message || t('results.fileNotStoredError'),
                            type: 'error',
                        });
                        return;
                    }
                } catch {
                    // Not a JSON error, continue with regular error handling
                }
                setNotification({
                    message: err.message,
                    type: 'error',
                });
            } else {
                setNotification({
                    message: t('common.reanalysisFailed'),
                    type: 'error',
                });
            }
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleCreateBadge = () => {
        if (!isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/badges');
            return;
        }

        router.push('/dashboard/badges');
    };

    const fetchAnalysisResult = async (fileHash: string, signal?: AbortSignal) => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.get<AnalyticsData>(`/api/files/${fileHash}`, { signal });
            setAnalyticsData(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            console.error('Failed to load analysis:', err);
            if (err instanceof Error && err.message.includes('404')) {
                setError('Analysis not found');
            } else {
                setError(t('common.loadAnalysisFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleHashSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchHash.trim()) {
            const urlSafeHash = searchHash
                .trim()
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
            router.push(`/result/${urlSafeHash}`);
        }
    };

    if (loading) {
        return <LoadingPage text={t('results.loading')} />;
    }

    if (error || !analyticsData) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
                <div className='flex items-center justify-center min-h-screen'>
                    <div className='text-center'>
                        <div className='text-red-400 text-6xl mb-4'>⚠️</div>
                        <h1 className='text-2xl font-bold mb-2'>{t('results.notFound')}</h1>
                        <p className='text-gray-300 mb-6'>{t('results.notFoundDescription')}</p>
                        <Link
                            href='/'
                            className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                        >
                            {t('results.backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    let metaDescription = '';
    let metaTitle = '';

    if (analyticsData.score >= 80) {
        metaTitle = `HIGH RISK: ${analyticsData.fileName} - Scan Result`;
        metaDescription = `HIGH RISK - "${analyticsData.fileName}" scored ${analyticsData.score}/100 in security analysis. Signs of malicious behavior detected. Do not use this file.`;
    } else if (analyticsData.score >= 60) {
        metaTitle = `SUSPICIOUS: ${analyticsData.fileName} - Scan Result`;
        metaDescription = `SUSPICIOUS - "${analyticsData.fileName}" scored ${analyticsData.score}/100. Potentially unsafe behavior detected. Use with extreme caution.`;
    } else if (analyticsData.score >= 30) {
        metaTitle = `Minor Concerns: ${analyticsData.fileName} - Scan Result`;
        metaDescription = `Minor concerns found in "${analyticsData.fileName}" (${analyticsData.score}/100). Review recommended before using this file.`;
    } else {
        metaTitle = `CLEAN: ${analyticsData.fileName} - Scan Result`;
        metaDescription = `CLEAN - "${analyticsData.fileName}" passed security scan (${analyticsData.score}/100). No malicious behavior detected. Safe to use.`;
    }

    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const ogImageUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/api/og-image/${hash}` : '';

    return (
        <div
            className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative'
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <DynamicMetaTags
                title={metaTitle}
                description={metaDescription}
                url={pageUrl}
                type='article'
                image={ogImageUrl}
            />

            <Navigation />

            <div className='px-6 py-6 bg-slate-800/20 border-b border-purple-800/30'>
                <div className='max-w-4xl mx-auto'>
                    <div className='hidden md:block'>
                        <form onSubmit={handleHashSearch} className='flex gap-4'>
                            <div className='flex-1'>
                                <input
                                    type='text'
                                    value={searchHash}
                                    onChange={e => setSearchHash(e.target.value)}
                                    placeholder={t('results.searchPlaceholder')}
                                    className='w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-colors'
                                />
                            </div>
                            <button
                                type='submit'
                                className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {t('results.search')}
                            </button>
                        </form>
                    </div>

                    <div className='md:hidden'>
                        {!showSearchBar && (
                            <div className='flex justify-center'>
                                <button
                                    onClick={() => setShowSearchBar(true)}
                                    className='flex items-center space-x-2 bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white hover:bg-slate-800/70 transition-all duration-300'
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
                                            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                                        />
                                    </svg>
                                    <span>{t('results.search')}</span>
                                </button>
                            </div>
                        )}

                        {showSearchBar && (
                            <div className='space-y-3'>
                                <form onSubmit={handleHashSearch} className='flex gap-2'>
                                    <div className='flex-1'>
                                        <input
                                            type='text'
                                            value={searchHash}
                                            onChange={e => setSearchHash(e.target.value)}
                                            placeholder={t('results.searchPlaceholder')}
                                            className='w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-colors'
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type='submit'
                                        className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-3 rounded-lg font-medium transition-all duration-300'
                                    >
                                        {t('results.search')}
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setShowSearchBar(false)}
                                        className='bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg font-medium transition-all duration-300'
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
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className='max-w-4xl mx-auto px-6 py-8'>
                <div className='bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 mb-8'>
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-4 md:space-y-0'>
                        <div className='flex-1'>
                            <h1 className='text-xl md:text-2xl font-bold text-white mb-2 break-words'>
                                {analyticsData.fileName}
                            </h1>
                            <p className='text-gray-400 text-sm md:text-base break-all'>
                                {t('common.sha256')} {hash}
                            </p>
                        </div>
                        <div className={`text-center ${getRiskColor(analyticsData.score)}`}>
                            <div className='relative w-20 h-20 md:w-24 md:h-24 mx-auto'>
                                <svg
                                    className='w-20 h-20 md:w-24 md:h-24 transform -rotate-90'
                                    viewBox='0 0 100 100'
                                >
                                    <circle
                                        cx='50'
                                        cy='50'
                                        r='40'
                                        stroke='currentColor'
                                        strokeWidth='8'
                                        fill='none'
                                        opacity='0.2'
                                    />
                                    <circle
                                        cx='50'
                                        cy='50'
                                        r='40'
                                        stroke='currentColor'
                                        strokeWidth='8'
                                        fill='none'
                                        strokeDasharray={`${(analyticsData.score / 100) * 251.2} 251.2`}
                                        strokeLinecap='round'
                                        className='transition-all duration-1000 ease-out'
                                    />
                                </svg>
                                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                                    <div className='text-base md:text-lg font-bold'>
                                        {analyticsData.score}
                                    </div>
                                    <div className='text-xs opacity-75'>/100</div>
                                </div>
                            </div>
                            <div className='text-xs md:text-sm break-words max-w-20 md:max-w-24 mt-2'>
                                {getRiskLevel(analyticsData.score, t)}
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                        <div>
                            <span className='text-gray-400'>{t('results.fileSize')}:</span>
                            <span className='ml-2 text-white'>
                                {formatFileSize(analyticsData.fileSizeBytes, t)}
                            </span>
                        </div>
                        <div>
                            <span className='text-gray-400'>{t('results.lastAnalysisDate')}:</span>
                            <span className='ml-2 text-white'>
                                {new Date(analyticsData.lastScanned).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {analyticsData.analyzerVersion && (
                        <div className='mt-4 pt-4 border-t border-purple-500/20'>
                            <div className='flex items-center gap-2 text-xs'>
                                <svg
                                    className='w-3.5 h-3.5 text-gray-500'
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
                                <span className='text-gray-500'>
                                    {t('results.analyzerVersion')} {analyticsData.analyzerVersion}
                                </span>
                                {isOutdated && (
                                    <span className='px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full'>
                                        {t('results.updateAvailable')}
                                    </span>
                                )}
                            </div>
                            {isOutdated && (
                                <details className='mt-2 text-xs text-blue-400'>
                                    <summary className='cursor-pointer hover:text-blue-300'>
                                        {t('results.whyRescan')}
                                    </summary>
                                    <p className='mt-2 text-slate-400'>
                                        {t('results.outdatedVersionInfo')
                                            .replace(
                                                '{{scanVersion}}',
                                                analyticsData.analyzerVersion
                                            )
                                            .replace('{{latestVersion}}', latestVersion || '')}
                                    </p>
                                </details>
                            )}
                        </div>
                    )}

                    {(analyticsData.assemblyCompany ||
                        analyticsData.assemblyProduct ||
                        analyticsData.assemblyTitle ||
                        analyticsData.assemblyGuid) && (
                        <div className='mt-4 pt-4 border-t border-purple-500/20'>
                            <button
                                onClick={() =>
                                    setAssemblyMetadataExpanded(!assemblyMetadataExpanded)
                                }
                                className='w-full text-sm font-semibold text-purple-400 mb-3 flex items-center justify-between gap-2 hover:text-purple-300 transition-colors'
                            >
                                <div className='flex items-center gap-2'>
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
                                            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                        />
                                    </svg>
                                    {t('results.assemblyMetadata.title')}
                                </div>
                                <svg
                                    className={`w-5 h-5 transition-transform duration-200 ${assemblyMetadataExpanded ? 'rotate-180' : ''}`}
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
                            {assemblyMetadataExpanded && (
                                <div className='grid grid-cols-1 gap-2 text-sm'>
                                    {analyticsData.assemblyCompany && (
                                        <div className='flex flex-col'>
                                            <span className='text-gray-400'>
                                                {t('results.assemblyMetadata.company')}
                                            </span>
                                            <span className='text-white break-words'>
                                                {analyticsData.assemblyCompany}
                                            </span>
                                        </div>
                                    )}
                                    {analyticsData.assemblyProduct && (
                                        <div className='flex flex-col'>
                                            <span className='text-gray-400'>
                                                {t('results.assemblyMetadata.product')}
                                            </span>
                                            <span className='text-white break-words'>
                                                {analyticsData.assemblyProduct}
                                            </span>
                                        </div>
                                    )}
                                    {analyticsData.assemblyTitle && (
                                        <div className='flex flex-col'>
                                            <span className='text-gray-400'>
                                                {t('results.assemblyMetadata.assemblyTitle')}
                                            </span>
                                            <span className='text-white break-words'>
                                                {analyticsData.assemblyTitle}
                                            </span>
                                        </div>
                                    )}
                                    {analyticsData.assemblyGuid && (
                                        <div className='flex flex-col'>
                                            <span className='text-gray-400'>
                                                {t('results.assemblyMetadata.guid')}
                                            </span>
                                            <span className='text-white break-words font-mono text-xs'>
                                                {analyticsData.assemblyGuid}
                                            </span>
                                        </div>
                                    )}
                                    {analyticsData.assemblyCopyright && (
                                        <div className='flex flex-col'>
                                            <span className='text-gray-400'>
                                                {t('results.assemblyMetadata.copyright')}
                                            </span>
                                            <span className='text-white break-words text-xs'>
                                                {analyticsData.assemblyCopyright}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className='bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6'>
                    <h2 className='text-xl font-bold mb-6'>{t('results.analysisResults')}</h2>

                    <div
                        className={`mb-6 p-4 rounded-lg border-2 ${
                            analyticsData.score >= 75
                                ? 'bg-red-900/20 border-red-500/50'
                                : analyticsData.score >= 50
                                  ? 'bg-orange-900/20 border-orange-500/50'
                                  : analyticsData.score >= 25
                                    ? 'bg-yellow-900/20 border-yellow-500/50'
                                    : 'bg-green-900/20 border-green-500/50'
                        }`}
                    >
                        <div className='flex items-start gap-3'>
                            <div className='text-2xl flex-shrink-0'>
                                {analyticsData.score >= 75
                                    ? '🚨'
                                    : analyticsData.score >= 50
                                      ? '⚠️'
                                      : analyticsData.score >= 25
                                        ? '⚡'
                                        : '✅'}
                            </div>
                            <div className='flex-1'>
                                <h3
                                    className={`font-bold text-lg mb-2 ${
                                        analyticsData.score >= 75
                                            ? 'text-red-400'
                                            : analyticsData.score >= 50
                                              ? 'text-orange-400'
                                              : analyticsData.score >= 25
                                                ? 'text-yellow-400'
                                                : 'text-green-400'
                                    }`}
                                >
                                    {analyticsData.score >= 75
                                        ? t('risk.highRiskDetected')
                                        : analyticsData.score >= 50
                                          ? t('risk.moderateRiskDetected')
                                          : analyticsData.score >= 25
                                            ? t('risk.lowRiskDetected')
                                            : t('risk.fileAppearsSafe')}
                                </h3>
                                <p className='text-gray-300 text-sm mb-3'>
                                    {analyticsData.score >= 75
                                        ? t('risk.highRiskDescription')
                                        : analyticsData.score >= 50
                                          ? t('risk.moderateRiskDescription')
                                          : analyticsData.score >= 25
                                            ? t('risk.lowRiskDescription')
                                            : t('risk.safeDescription')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='bg-slate-900/50 rounded-lg p-4'>
                        <h3 className='font-semibold mb-3 text-white flex items-center gap-2'>
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
                                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                            </svg>
                            {t('risk.recommendations')}
                        </h3>
                        <div className='space-y-2 text-sm text-gray-300'>
                            {analyticsData.score >= 75 ? (
                                <>
                                    <p className='text-red-400 font-semibold mb-2'>
                                        ⛔ {t('risk.doNotUse')}
                                    </p>
                                    <ul className='space-y-1 ml-4 text-sm'>
                                        <li>• {t('risk.deleteFile')}</li>
                                        <li>• {t('risk.scanSystem')}</li>
                                        <li>• {t('risk.reportSource')}</li>
                                    </ul>
                                </>
                            ) : analyticsData.score >= 50 ? (
                                <>
                                    <p className='text-orange-400 font-semibold mb-2'>
                                        ⚠️ {t('risk.useCaution')}
                                    </p>
                                    <ul className='space-y-1 ml-4 text-sm'>
                                        <li>• {t('risk.onlyIfTrust')}</li>
                                        <li>• {t('risk.testSandbox')}</li>
                                        <li>• {t('risk.monitorBehavior')}</li>
                                    </ul>
                                </>
                            ) : analyticsData.score >= 25 ? (
                                <>
                                    <p className='text-yellow-400 font-semibold mb-2'>
                                        ⚡ {t('risk.reviewBeforeUse')}
                                    </p>
                                    <ul className='space-y-1 ml-4 text-sm'>
                                        <li>• {t('risk.verifySource')}</li>
                                        <li>• {t('risk.checkPermissions')}</li>
                                        <li>• {t('risk.keepBackups')}</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p className='text-green-400 font-semibold mb-2'>
                                        ✅ {t('risk.safeToUse')}
                                    </p>
                                    <ul className='space-y-1 ml-4 text-sm'>
                                        <li>• {t('risk.passedChecks')}</li>
                                        <li>• {t('risk.downloadTrusted')}</li>
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>

                    <div className='mt-8 bg-slate-900/50 rounded-lg border border-purple-500/30 p-6'>
                        <h3 className='text-xl font-bold text-white mb-4 flex items-center gap-2'>
                            <svg
                                className='w-6 h-6 text-green-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
                                />
                            </svg>
                            {t('results.securityAnalysis.detectionEngine')}
                        </h3>
                        <p className='text-gray-400 text-sm mb-4'>
                            {analyticsData.checked && analyticsData.checked.length > 0
                                ? `${analyticsData.checked.length} ${analyticsData.checked.length === 1 ? t('results.securityAnalysis.detectionsFound') : t('results.securityAnalysis.detectionsFoundPlural')}`
                                : t('results.securityAnalysis.noDetections')}
                        </p>

                        <div className='max-w-md'>
                            <div
                                className={`border rounded-lg p-4 ${
                                    analyticsData.checked && analyticsData.checked.length > 0
                                        ? 'border-red-500/50 bg-red-900/20'
                                        : 'border-green-500/50 bg-green-900/20'
                                }`}
                            >
                                <div className='flex items-center justify-between mb-2'>
                                    <div className='flex items-center gap-2'>
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
                                                d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
                                            />
                                        </svg>
                                        <span className='font-medium text-white'>
                                            {t('results.securityAnalysis.blacklistedCommands')}
                                        </span>
                                    </div>
                                    {analyticsData.checked && analyticsData.checked.length > 0 ? (
                                        <span className='text-red-400 text-sm font-semibold'>
                                            ⚠️ {t('results.securityAnalysis.detected')}
                                        </span>
                                    ) : (
                                        <span className='text-green-400 text-sm font-semibold'>
                                            ✓ {t('results.securityAnalysis.clean')}
                                        </span>
                                    )}
                                </div>
                                <p className='text-xs text-gray-400'>
                                    {t('results.securityAnalysis.blacklistedCommandsDesc')}
                                </p>
                            </div>
                        </div>

                        <div className='mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg'>
                            <p className='text-blue-300 text-xs flex items-start gap-2'>
                                <svg
                                    className='w-4 h-4 flex-shrink-0 mt-0.5'
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
                                <span>{t('results.securityAnalysis.moreAnalyzersNote')}</span>
                            </p>
                        </div>
                    </div>

                    {analyticsData.checked && analyticsData.checked.length > 0 && (
                        <div className='mt-8 bg-slate-900/50 rounded-lg overflow-hidden border border-purple-500/30'>
                            <button
                                onClick={() =>
                                    setSecurityAnalysisExpanded(!securityAnalysisExpanded)
                                }
                                className='w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors'
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                        />
                                    </svg>
                                    <div className='text-left'>
                                        <h3 className='text-xl font-bold text-white'>
                                            {t('results.securityAnalysis.title')}
                                        </h3>
                                        <p className='text-sm text-gray-400'>
                                            {analyticsData.checked.length}{' '}
                                            {analyticsData.checked.length === 1
                                                ? t('results.securityAnalysis.securityCheck')
                                                : t('results.securityAnalysis.securityChecks')}{' '}
                                            {t('results.securityAnalysis.checksDetected')}
                                        </p>
                                    </div>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${securityAnalysisExpanded ? 'rotate-180' : ''}`}
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

                            {securityAnalysisExpanded && (
                                <div className='px-6 pb-6 space-y-3'>
                                    {analyticsData.checked.map((item, index) => {
                                        const checkInfo = getSecurityCheckInfo(item);
                                        const severityColors = {
                                            high: 'border-red-500/50 bg-red-900/20',
                                            medium: 'border-yellow-500/50 bg-yellow-900/20',
                                            low: 'border-blue-500/50 bg-blue-900/20',
                                        };
                                        const severityTextColors = {
                                            high: 'text-red-400',
                                            medium: 'text-yellow-400',
                                            low: 'text-blue-400',
                                        };
                                        const severityBadgeColors = {
                                            high: 'bg-red-500/20 text-red-300 border-red-500/30',
                                            medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                                            low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                                        };

                                        return (
                                            <div
                                                key={index}
                                                className={`border rounded-lg p-4 ${severityColors[checkInfo.severity]} hover:bg-opacity-30 transition-all`}
                                            >
                                                <div className='flex items-start gap-3'>
                                                    <div className='text-2xl flex-shrink-0'>
                                                        {checkInfo.icon}
                                                    </div>
                                                    <div className='flex-1 min-w-0'>
                                                        <div className='flex items-start justify-between gap-2 mb-2'>
                                                            <h4
                                                                className={`font-semibold text-base ${severityTextColors[checkInfo.severity]}`}
                                                            >
                                                                {checkInfo.name}
                                                            </h4>
                                                            <span
                                                                className={`px-2 py-1 text-xs font-medium rounded-full border flex-shrink-0 ${severityBadgeColors[checkInfo.severity]}`}
                                                            >
                                                                {checkInfo.severity === 'high'
                                                                    ? t(
                                                                          'results.securityAnalysis.highRisk'
                                                                      )
                                                                    : checkInfo.severity ===
                                                                        'medium'
                                                                      ? t(
                                                                            'results.securityAnalysis.mediumRisk'
                                                                        )
                                                                      : t(
                                                                            'results.securityAnalysis.lowRisk'
                                                                        )}
                                                            </span>
                                                        </div>
                                                        <p className='text-sm text-gray-300 mb-2'>
                                                            {checkInfo.description}
                                                        </p>
                                                        <details className='mt-2'>
                                                            <summary className='text-xs text-purple-400 cursor-pointer hover:text-purple-300 select-none'>
                                                                {t(
                                                                    'results.securityAnalysis.technicalDetails'
                                                                )}
                                                            </summary>
                                                            <div className='mt-2 p-2 bg-slate-950/50 rounded border border-slate-700'>
                                                                <code className='text-xs text-gray-400 font-mono break-all'>
                                                                    {item}
                                                                </code>
                                                            </div>
                                                        </details>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className='mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg'>
                                        <div className='flex items-start gap-2'>
                                            <svg
                                                className='w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5'
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
                                            <div className='text-sm text-blue-300'>
                                                {t('results.securityAnalysis.detectionsNote')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className='mt-6 pt-6 border-t border-purple-500/30'>
                        <div className='text-center'>
                            <div className='flex items-center justify-center gap-2 mb-4'>
                                <p className='text-gray-400 text-sm md:text-base'>
                                    {t('results.reanalyzeDescription')}
                                </p>
                                <div className='group relative'>
                                    <svg
                                        onClick={() =>
                                            setShowReanalyzeTooltip(!showReanalyzeTooltip)
                                        }
                                        className='w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer'
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
                                    <div
                                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3 bg-slate-900 text-slate-200 text-xs rounded-lg shadow-xl border border-purple-500/30 z-10 ${showReanalyzeTooltip ? 'block' : 'hidden md:group-hover:block'}`}
                                    >
                                        {isFileStored === false ? (
                                            <>
                                                <p className='font-semibold text-red-400 mb-2'>
                                                    {t('results.reanalyzeNotAvailable')}
                                                </p>
                                                <p className='text-slate-300 mb-2'>
                                                    {t('results.reanalyzeNotStoredExplanation')}
                                                </p>
                                                <p className='text-slate-400'>
                                                    {t('results.reanalyzeUploadAgain')}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className='font-semibold text-purple-300 mb-2'>
                                                    {t('results.reanalyzeAvailability')}
                                                </p>
                                                <ul className='space-y-1.5 text-left'>
                                                    <li className='flex items-start gap-2'>
                                                        <span className='text-green-400 flex-shrink-0'>
                                                            ✓
                                                        </span>
                                                        <span>
                                                            {t('results.reanalyzeAvailableWebsite')}
                                                        </span>
                                                    </li>
                                                    <li className='flex items-start gap-2'>
                                                        <span className='text-red-400 flex-shrink-0'>
                                                            ✗
                                                        </span>
                                                        <span>
                                                            {t('results.reanalyzeNotAvailableApi')}
                                                        </span>
                                                    </li>
                                                </ul>
                                                <p className='mt-2 pt-2 border-t border-slate-700 text-slate-400'>
                                                    {t('results.reanalyzeUploadAgain')}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleReanalyze}
                                disabled={isReanalyzing || isFileStored === false}
                                className='bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 mx-auto text-sm md:text-base'
                            >
                                {isReanalyzing ? (
                                    <svg
                                        className='animate-spin -ml-1 mr-2 md:mr-3 h-4 w-4 text-white'
                                        xmlns='http://www.w3.org/2000/svg'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                    >
                                        <circle
                                            className='opacity-25'
                                            cx='12'
                                            cy='12'
                                            r='10'
                                            stroke='currentColor'
                                            strokeWidth='4'
                                        ></circle>
                                        <path
                                            className='opacity-75'
                                            fill='currentColor'
                                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                        ></path>
                                    </svg>
                                ) : (
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
                                )}
                                <span>
                                    {isReanalyzing
                                        ? t('hero.scanning')
                                        : t('results.reanalyzeButton')}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className='mt-8 bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden'>
                    <button
                        onClick={() => setBadgeEmbedExpanded(!badgeEmbedExpanded)}
                        className='w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors'
                    >
                        <h2 className='text-xl font-bold flex items-center gap-2'>
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
                                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                />
                            </svg>
                            {t('badges.embedTitle')}
                        </h2>
                        <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${badgeEmbedExpanded ? 'rotate-180' : ''}`}
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

                    {badgeEmbedExpanded && (
                        <div className='px-6 pb-6'>
                            {isAuthenticated ? (
                                <div className='mb-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                                    <div className='flex items-start gap-3 mb-3'>
                                        <svg
                                            className='w-5 h-5 text-green-400 flex-shrink-0 mt-0.5'
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
                                        <div className='flex-1'>
                                            <h3 className='text-green-400 font-semibold mb-1'>
                                                {t('badges.recommended')}
                                            </h3>
                                            <p className='text-slate-300 text-sm mb-3'>
                                                {t('badges.recommendedDescription')}
                                            </p>
                                            <button
                                                onClick={handleCreateBadge}
                                                className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
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
                                                        d='M12 4v16m8-8H4'
                                                    />
                                                </svg>
                                                {t('badges.createSecure')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className='mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4'>
                                    <div className='flex items-start gap-3'>
                                        <svg
                                            className='w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5'
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
                                        <div className='flex-1'>
                                            <h3 className='text-blue-400 font-semibold mb-1'>
                                                {t('badges.createSecureProduction')}
                                            </h3>
                                            <p className='text-slate-300 text-sm mb-3'>
                                                {t('badges.createSecureDescription')}{' '}
                                                <Link
                                                    href={`/login?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/result/${hash}`)}`}
                                                    className='text-blue-400 hover:text-blue-300 underline'
                                                >
                                                    {t('badges.signIn')}
                                                </Link>
                                                {t('badges.secureDescription')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className='mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3'>
                                <div className='flex items-start gap-2'>
                                    <svg
                                        className='w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5'
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
                                    <p className='text-yellow-300 text-xs'>
                                        <strong>{t('badges.warning')}</strong>{' '}
                                        {t('badges.warningDescription')}{' '}
                                        {isAuthenticated ? (
                                            <>{t('badges.useSecure')}</>
                                        ) : (
                                            <>
                                                <Link
                                                    href={`/login?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/result/${hash}`)}`}
                                                    className='text-yellow-400 hover:text-yellow-300 underline'
                                                >
                                                    {t('badges.signIn')}
                                                </Link>{' '}
                                                {t('badges.createSecureForProduction')}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <p className='text-slate-400 text-sm mb-4'>{t('badges.quickBadge')}</p>

                            <div className='bg-slate-900/50 rounded-lg p-4 mb-4 text-center'>
                                <p className='text-slate-400 text-xs mb-3'>{t('common.preview')}</p>
                                <a
                                    href={
                                        typeof window !== 'undefined' ? window.location.href : '#'
                                    }
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    <Image
                                        src={
                                            analyticsData
                                                ? `/api/v1.0/badge/filename/${encodeURIComponent(analyticsData.fileName)}`
                                                : ''
                                        }
                                        alt='Safeturned Scan Badge'
                                        width={200}
                                        height={20}
                                        className='inline-block'
                                        unoptimized
                                        onError={e => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                </a>
                            </div>

                            <div className='mb-4'>
                                <label className='block text-sm font-semibold text-white mb-2'>
                                    {t('badges.markdown')}
                                </label>
                                <div className='bg-slate-900/70 rounded-lg p-3 border border-slate-700 relative group'>
                                    <code className='text-xs text-green-400 font-mono break-all'>
                                        {analyticsData &&
                                            `[![Safeturned](${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1.0/badge/filename/${encodeURIComponent(analyticsData.fileName)})](${typeof window !== 'undefined' ? window.location.href : ''})`}
                                    </code>
                                    <button
                                        onClick={() => {
                                            if (!analyticsData) return;
                                            const code = `[![Safeturned](${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1.0/badge/filename/${encodeURIComponent(analyticsData.fileName)})](${typeof window !== 'undefined' ? window.location.href : ''})`;
                                            navigator.clipboard.writeText(code);
                                            setNotification({
                                                message: t('badges.markdownCopied'),
                                                type: 'success',
                                            });
                                        }}
                                        className='absolute top-2 right-2 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity'
                                    >
                                        {t('badges.copy')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className='block text-sm font-semibold text-white mb-2'>
                                    {t('badges.html')}
                                </label>
                                <div className='bg-slate-900/70 rounded-lg p-3 border border-slate-700 relative group'>
                                    <code className='text-xs text-blue-400 font-mono break-all'>
                                        {analyticsData &&
                                            `<a href="${typeof window !== 'undefined' ? window.location.href : ''}"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1.0/badge/filename/${encodeURIComponent(analyticsData.fileName)}" alt="Safeturned" /></a>`}
                                    </code>
                                    <button
                                        onClick={() => {
                                            if (!analyticsData) return;
                                            const code = `<a href="${typeof window !== 'undefined' ? window.location.href : ''}"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1.0/badge/filename/${encodeURIComponent(analyticsData.fileName)}" alt="Safeturned" /></a>`;
                                            navigator.clipboard.writeText(code);
                                            setNotification({
                                                message: t('badges.htmlCopied'),
                                                type: 'success',
                                            });
                                        }}
                                        className='absolute top-2 right-2 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity'
                                    >
                                        {t('badges.copy')}
                                    </button>
                                </div>
                            </div>

                            <div className='mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg'>
                                <p className='text-blue-300 text-xs flex items-start gap-2'>
                                    <svg
                                        className='w-4 h-4 flex-shrink-0 mt-0.5'
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
                                    <span>{t('badges.autoUpdate')}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className='mt-6 md:mt-8 text-center md:hidden'>
                    <p className='text-gray-400 mb-3 md:mb-4 text-sm md:text-base'>
                        {t('results.shareDescription')}
                    </p>
                    <div className='flex justify-center gap-3 md:gap-4'>
                        <button
                            onClick={handleShare}
                            className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm md:text-base'
                        >
                            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                                <path d='M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z' />
                            </svg>
                            <span>{t('results.shareButton')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {isDragOver && (
                <div className='fixed inset-0 bg-purple-900/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none'>
                    <div className='text-center'>
                        <div className='text-6xl mb-4'>📁</div>
                        <h2 className='text-2xl font-bold text-white mb-2'>
                            {t('dragDrop.overlayTitle', 'Drop file to scan')}
                        </h2>
                        <p className='text-gray-300'>
                            {t('dragDrop.overlayDescription', 'Release to start scanning')}
                        </p>
                    </div>
                </div>
            )}

            {showDragUpload && dragFile && (
                <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'>
                    <div className='bg-slate-800/95 border border-purple-500/50 rounded-xl p-8 max-w-md w-full mx-4'>
                        <div className='text-center mb-6'>
                            <div className='text-4xl mb-4'>📄</div>
                            <h3 className='text-xl font-semibold mb-2'>
                                {t('hero.fileSelected', 'File Selected')}
                            </h3>
                            <p className='text-gray-400 truncate max-w-full' title={dragFile.name}>
                                {dragFile.name}
                            </p>
                            <p className='text-sm text-gray-500 mt-1'>
                                {formatFileSize(dragFile.size, t)}
                            </p>
                        </div>

                        <div className='flex gap-4 justify-center'>
                            <button
                                onClick={() => handleDragUpload()}
                                disabled={isUploading}
                                className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {isUploading
                                    ? t('hero.scanning', 'Scanning...')
                                    : t('hero.confirmUpload', 'Scan Now')}
                            </button>
                            <button
                                onClick={handleCancelDragUpload}
                                disabled={isUploading}
                                className='bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isUploading && (
                <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'>
                    <div className='bg-slate-800/95 border border-purple-500/50 rounded-xl p-8 max-w-lg w-full mx-4'>
                        <div className='text-center'>
                            <div className='w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
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
                                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                    />
                                </svg>
                            </div>

                            <h3 className='text-xl font-semibold mb-4 text-white'>
                                {useChunkedUploadForFile && chunkedUpload.status
                                    ? chunkedUpload.status
                                    : t('common.uploading', 'Uploading...')}
                            </h3>

                            <div className='w-full bg-gray-700 rounded-full h-2 mb-4'>
                                <div
                                    className='bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300'
                                    style={{
                                        width: useChunkedUploadForFile
                                            ? `${chunkedUpload.progress}%`
                                            : '100%',
                                    }}
                                />
                            </div>

                            <div className='text-center'>
                                <div className='text-sm text-gray-300 mb-2'>
                                    {useChunkedUploadForFile && chunkedUpload.status
                                        ? chunkedUpload.status
                                        : t('common.processing', 'Processing...')}
                                </div>
                                {useChunkedUploadForFile && (
                                    <div className='text-xs text-gray-400'>
                                        {Math.round(chunkedUpload.progress)}%{' '}
                                        {t('common.complete', 'complete')}
                                    </div>
                                )}
                                {chunkedUpload.isPreparing && (
                                    <div className='flex items-center justify-center mt-2'>
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400'></div>
                                    </div>
                                )}
                            </div>

                            {useChunkedUploadForFile && (
                                <button
                                    onClick={chunkedUpload.cancelUpload}
                                    className='mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors'
                                >
                                    {t('common.cancelUpload', 'Cancel Upload')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div
                    className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 ${
                        notification.type === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                    }`}
                >
                    {notification.message}
                </div>
            )}

            <BackToTop />
            <Footer />
        </div>
    );
}
