'use client';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = false;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

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
import { API_BASE_URL } from '@/lib/apiConfig';

interface LoaderVersion {
    version: string;
    createdAt: string;
    isLatest: boolean;
}

interface ApiKey {
    id: string;
    name: string;
    isActive: boolean;
}

interface OfficialBadgesStatus {
    allVerified: boolean;
    badges: Array<{
        id: string;
        name: string;
        isVerified: boolean;
        updatedAt: string;
    }>;
}

const FRAMEWORKS = [{ id: 'module', name: 'Module' }];

export default function LoaderPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t, locale } = useTranslation();
    const router = useRouter();

    const [versions, setVersions] = useState<LoaderVersion[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [selectedFramework, setSelectedFramework] = useState('module');
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [loadingVersions, setLoadingVersions] = useState(true);
    const [loadingKeys, setLoadingKeys] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFrameworkTooltip, setShowFrameworkTooltip] = useState(false);
    const [showVersionTooltip, setShowVersionTooltip] = useState(false);
    const [showVerifiedTooltip, setShowVerifiedTooltip] = useState(false);
    const [officialBadgesVerified, setOfficialBadgesVerified] = useState(false);

    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/loader');
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchVersions();
            fetchApiKeys();
            fetchOfficialBadgesStatus();
        }
    }, [isAuthenticated, selectedFramework]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        };
    }, []);

    const fetchVersions = async () => {
        setLoadingVersions(true);
        setError(null);
        try {
            const data = await api.get<LoaderVersion[]>(
                `loaders/versions?framework=${selectedFramework}`
            );
            setVersions(data);
            const latest = data.find(v => v.isLatest);
            if (latest) {
                setSelectedVersion(latest.version);
            } else if (data.length > 0) {
                setSelectedVersion(data[0].version);
            }
        } catch (err) {
            console.error('Failed to fetch loader versions:', err);
            setVersions([]);
        } finally {
            setLoadingVersions(false);
        }
    };

    const fetchApiKeys = async () => {
        setLoadingKeys(true);
        try {
            const data = await api.get<ApiKey[]>('users/me/api-keys');
            setApiKeys(data.filter(k => k.isActive));
        } catch {
            setApiKeys([]);
        } finally {
            setLoadingKeys(false);
        }
    };

    const fetchOfficialBadgesStatus = async () => {
        try {
            const data = await api.get<OfficialBadgesStatus>('badges/official/status');
            setOfficialBadgesVerified(data.allVerified);
        } catch {
            setOfficialBadgesVerified(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedVersion) return;

        setDownloading(true);
        setDownloadSuccess(false);
        setError(null);

        try {
            const url = `${API_BASE_URL}/v1.0/loaders?framework=${selectedFramework}&version=${selectedVersion}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Safeturned.Loader_${selectedVersion}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            setDownloadSuccess(true);
            successTimeoutRef.current = setTimeout(() => {
                setDownloadSuccess(false);
            }, 3000);
        } catch (err) {
            console.error('Download error:', err);
            setError(t('loader.downloadError'));
        } finally {
            setDownloading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedHash(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedHash(false), 2000);
    };

    const formatReleaseDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const selectedVersionData = versions.find(v => v.version === selectedVersion);

    if (isLoading || !isAuthenticated || !user) {
        return <LoadingPage text={t('common.loading')} />;
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-4xl mx-auto px-6 py-12'>
                <Link
                    href='/dashboard'
                    className='inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors'
                >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 19l-7-7 7-7'
                        />
                    </svg>
                    {t('common.backToDashboard')}
                </Link>

                <div className='mb-10'>
                    <div className='flex items-center gap-4 mb-4'>
                        <div className='w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25'>
                            <svg
                                className='w-7 h-7'
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
                        <div>
                            <h1 className='text-3xl md:text-4xl font-bold'>
                                {t('loader.pageTitle')}
                            </h1>
                            <p className='text-slate-400 mt-1'>{t('loader.pageSubtitle')}</p>
                        </div>
                    </div>
                </div>

                <div className='bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 mb-8'>
                    <div className='flex items-start gap-4'>
                        <div className='w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                            <svg
                                className='w-5 h-5 text-amber-400'
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
                        <div className='flex-1'>
                            <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                                {t('loader.apiKeyRequired')}
                            </h3>
                            <p className='text-amber-200/80 text-sm mb-4'>
                                {t('loader.apiKeyRequiredDesc')}
                            </p>
                            <div className='flex flex-wrap gap-3'>
                                <Link
                                    href='/dashboard/api-keys'
                                    className='inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-300 text-sm font-medium transition-colors'
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
                                    {t('loader.createApiKey')}
                                </Link>
                                <Link
                                    href='/dashboard/api-keys'
                                    className='inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm font-medium transition-colors'
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
                                            d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                                        />
                                    </svg>
                                    {t('loader.viewMyKeys')}
                                </Link>
                            </div>
                            {!loadingKeys && (
                                <div className='mt-4 flex items-center gap-2'>
                                    {apiKeys.length > 0 ? (
                                        <>
                                            <svg
                                                className='w-4 h-4 text-green-400'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M5 13l4 4L19 7'
                                                />
                                            </svg>
                                            <span className='text-green-400 text-sm'>
                                                {t('loader.hasApiKeys', undefined, {
                                                    count: apiKeys.length.toString(),
                                                })}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className='w-4 h-4 text-amber-400'
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
                                            <span className='text-amber-400 text-sm'>
                                                {t('loader.noApiKeys')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className='bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6 mb-8'>
                    <div className='flex items-center gap-3 mb-6'>
                        <div className='w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center'>
                            <svg
                                className='w-4 h-4 text-cyan-400'
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
                        <h2 className='text-xl font-semibold text-cyan-300'>
                            {t('loader.downloadTitle')}
                        </h2>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                        <div>
                            <label className='flex items-center gap-2 text-sm font-medium text-slate-300 mb-2'>
                                {t('loader.framework')}
                                <div className='relative group'>
                                    <svg
                                        onClick={() =>
                                            setShowFrameworkTooltip(!showFrameworkTooltip)
                                        }
                                        className='w-4 h-4 text-slate-500 cursor-pointer'
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
                                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-200 text-xs rounded-lg shadow-xl border border-cyan-500/30 z-10 ${showFrameworkTooltip ? 'block' : 'hidden md:group-hover:block'}`}
                                    >
                                        {t('loader.frameworkHelp')}
                                    </div>
                                </div>
                            </label>
                            <select
                                value={selectedFramework}
                                onChange={e => setSelectedFramework(e.target.value)}
                                className='w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
                            >
                                {FRAMEWORKS.map(fw => (
                                    <option key={fw.id} value={fw.id}>
                                        {fw.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className='flex items-center gap-2 text-sm font-medium text-slate-300 mb-2'>
                                {t('loader.version')}
                                {officialBadgesVerified && (
                                    <div className='relative group inline-flex items-center'>
                                        <span className='inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-400'>
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
                                                    d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                                />
                                            </svg>
                                            {t('loader.verified')}
                                        </span>
                                        <svg
                                            onClick={() =>
                                                setShowVerifiedTooltip(!showVerifiedTooltip)
                                            }
                                            className='w-4 h-4 text-slate-500 cursor-pointer ml-1'
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
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-slate-200 text-xs rounded-lg shadow-xl border border-green-500/30 z-10 ${showVerifiedTooltip ? 'block' : 'hidden md:group-hover:block'}`}
                                        >
                                            <p className='font-semibold text-green-400 mb-2'>
                                                {t('loader.verifiedTitle')}
                                            </p>
                                            <p>{t('loader.verifiedDescription')}</p>
                                        </div>
                                    </div>
                                )}
                                <div className='relative group'>
                                    <svg
                                        onClick={() => setShowVersionTooltip(!showVersionTooltip)}
                                        className='w-4 h-4 text-slate-500 cursor-pointer'
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
                                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-200 text-xs rounded-lg shadow-xl border border-cyan-500/30 z-10 ${showVersionTooltip ? 'block' : 'hidden md:group-hover:block'}`}
                                    >
                                        {t('loader.versionHelp')}
                                    </div>
                                </div>
                            </label>
                            {loadingVersions ? (
                                <div className='w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-3 text-slate-400'>
                                    {t('common.loading')}...
                                </div>
                            ) : versions.length === 0 ? (
                                <div className='w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-3 text-slate-400'>
                                    {t('loader.noVersions')}
                                </div>
                            ) : (
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    className='w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
                                >
                                    {versions.map(v => (
                                        <option key={v.version} value={v.version}>
                                            v{v.version}
                                            {v.isLatest ? ` (${t('loader.latest')})` : ''} -{' '}
                                            {formatReleaseDate(v.createdAt)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className='mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm'>
                            {error}
                        </div>
                    )}

                    <div className='flex flex-col items-center'>
                        <button
                            onClick={handleDownload}
                            disabled={downloading || !selectedVersion || versions.length === 0}
                            className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                                downloadSuccess
                                    ? 'bg-green-600 hover:bg-green-600'
                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-cyan-500/25`}
                        >
                            {downloading ? (
                                <>
                                    <svg
                                        className='w-5 h-5 animate-spin'
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
                                        />
                                        <path
                                            className='opacity-75'
                                            fill='currentColor'
                                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                        />
                                    </svg>
                                    {t('loader.downloading')}
                                </>
                            ) : downloadSuccess ? (
                                <>
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
                                            d='M5 13l4 4L19 7'
                                        />
                                    </svg>
                                    {t('loader.downloaded')}
                                </>
                            ) : (
                                <>
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
                                    {t('loader.downloadButton')}
                                </>
                            )}
                        </button>

                        {selectedVersionData && (
                            <p className='text-slate-400 text-sm mt-3'>
                                {t('loader.versionInfo', undefined, {
                                    version: selectedVersionData.version,
                                    date: formatReleaseDate(selectedVersionData.createdAt),
                                })}
                            </p>
                        )}
                    </div>
                </div>

                <div className='bg-slate-800/60 border border-slate-700/50 rounded-xl p-6'>
                    <div className='flex items-center gap-3 mb-6'>
                        <div className='w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center'>
                            <svg
                                className='w-4 h-4 text-purple-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
                                />
                            </svg>
                        </div>
                        <h2 className='text-xl font-semibold'>{t('loader.instructionsTitle')}</h2>
                    </div>

                    <div className='space-y-6'>
                        {[1, 2, 3, 4].map(step => (
                            <div key={step} className='flex gap-4'>
                                <div className='w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0'>
                                    {step}
                                </div>
                                <div className='flex-1'>
                                    <h4 className='font-medium text-white mb-1'>
                                        {t(`loader.step${step}Title`)}
                                    </h4>
                                    <p className='text-slate-400 text-sm'>
                                        {t(`loader.step${step}Desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='mt-8'>
                        <div className='flex items-center justify-between mb-3'>
                            <span className='text-sm text-slate-400'>
                                {t('loader.configExample')}
                            </span>
                            <button
                                onClick={() =>
                                    copyToClipboard(`{
  "ApiKey": "sk_live_xxxxxxxxxxxxx",
  "ScanIntervalSeconds": 300,
  "WatchPaths": ["Modules", "Servers/*/Rocket/Plugins"]
}`)
                                }
                                className='text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1'
                            >
                                {copiedHash ? (
                                    <>
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
                                                d='M5 13l4 4L19 7'
                                            />
                                        </svg>
                                        {t('common.copied')}
                                    </>
                                ) : (
                                    <>
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
                                                d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                            />
                                        </svg>
                                        {t('common.copy')}
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className='bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 overflow-x-auto'>
                            <code>{`{
  "ApiKey": "sk_live_xxxxxxxxxxxxx",
  "ScanIntervalSeconds": 300,
  "WatchPaths": ["Modules", "Servers/*/Rocket/Plugins"]
}`}</code>
                        </pre>
                    </div>
                </div>
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
