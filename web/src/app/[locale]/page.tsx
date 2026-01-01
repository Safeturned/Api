'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import StandardFileUpload from '@/components/StandardFileUpload';
import { formatScanTime, computeFileHash, encodeHashForUrl } from '@/lib/utils';
import { api } from '@/lib/api-client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

interface SystemAnalytics {
    totalFilesScanned: number;
    totalThreatsDetected: number;
    averageScanTimeMs: number;
    lastUpdated: string;
    totalSafeFiles: number;
    averageScore: number;
    firstScanDate: string;
    lastScanDate: string;
    totalScanTimeMs: number;
    threatDetectionRate: number;
}

export const dynamic = 'force-dynamic';

export default function Page() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [useChunkedUploadForFile, setUseChunkedUploadForFile] = useState(false);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    const CHUNKED_UPLOAD_THRESHOLD = 100 * 1024 * 1024;

    const chunkedUpload = useChunkedUpload({
        onComplete: (result: Record<string, unknown>) => {
            sessionStorage.setItem('uploadResult', JSON.stringify(result));
            let hash;
            if (result.id) {
                hash = result.id;
            } else if (result.fileHash && typeof result.fileHash === 'string') {
                hash = encodeHashForUrl(result.fileHash);
            } else if (result.hash && typeof result.hash === 'string') {
                hash = result.hash;
            } else {
                hash =
                    typeof result.fileHash === 'string' ? result.fileHash : Date.now().toString();
                hash = encodeHashForUrl(hash);
            }

            router.push(`/result/${hash}`);
        },
        onError: (error: string) => {
            setError(error);
            setIsScanning(false);
        },
    });

    const fetchSystemAnalytics = async () => {
        try {
            setIsLoadingAnalytics(true);
            const data = await api.get<SystemAnalytics>('/api/analytics');
            setSystemAnalytics(data);
        } catch (error) {
            console.error('Failed to fetch system analytics:', error);
        } finally {
            setIsLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        setIsLoaded(true);
        document.documentElement.style.scrollBehavior = 'smooth';
        fetchSystemAnalytics();

        return () => {
            document.documentElement.style.scrollBehavior = 'auto';
        };
    }, []);

    const handleFileSelect = (file: File) => {
        setUseChunkedUploadForFile(file.size > CHUNKED_UPLOAD_THRESHOLD);
        setError(null);
    };

    const handleUpload = async (file: File) => {
        if (!file) return;

        setIsScanning(true);
        setError(null);

        try {
            if (useChunkedUploadForFile) {
                await chunkedUpload.uploadFile(file);
            } else {
                const formData = new FormData();
                formData.append('file', file, file.name);

                const result = await api.post<{ id?: string; fileHash?: string; hash?: string }>(
                    '/api/upload',
                    formData
                );

                sessionStorage.setItem('uploadResult', JSON.stringify(result));
                let hash;
                if (result?.id) {
                    hash = result.id;
                } else if (result?.fileHash) {
                    hash = encodeHashForUrl(result.fileHash);
                } else if (result?.hash) {
                    hash = result.hash;
                } else {
                    hash = await computeFileHash(file);
                    hash = encodeHashForUrl(hash);
                }

                router.push(`/result/${hash}`);
            }
        } catch (err) {
            if (err instanceof Error) {
                if (
                    err.message.includes('Failed to fetch') ||
                    err.message.includes('NetworkError')
                ) {
                    setError(
                        'Network error: Unable to connect to the server. Please check your internet connection.'
                    );
                } else {
                    setError(err.message);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            if (!useChunkedUploadForFile) {
                setIsScanning(false);
            }
        }
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative'>
            <Navigation />

            <section className='px-6 py-8 md:py-12'>
                <div className='max-w-6xl mx-auto text-center'>
                    <div className='mb-8'>
                        <div className='mb-6 flex justify-center'>
                            <div
                                className={`inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium transition-all duration-700 ${
                                    isLoaded
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-10 opacity-0'
                                }`}
                            >
                                <svg
                                    className='w-4 h-4'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                    />
                                </svg>
                                <span>{t('hero.featureBadge')}</span>
                            </div>
                        </div>
                        <h1
                            className={`text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white transition-all duration-700 delay-100 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            <span className='bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent'>
                                {t('hero.title')}
                            </span>
                        </h1>
                        <p
                            className={`text-lg md:text-xl text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            {t('hero.subtitle')}
                        </p>
                    </div>

                    <div className='max-w-2xl mx-auto mb-4'>
                        <p className='text-xs text-gray-500 text-center leading-relaxed'>
                            {t('consent.prefix')}
                            <Link
                                href='/terms'
                                className='text-purple-400 hover:text-purple-300 underline transition-colors duration-200'
                            >
                                {t('consent.termsOfService')}
                            </Link>
                            {t('consent.and')}
                            <Link
                                href='/privacy'
                                className='text-purple-400 hover:text-purple-300 underline transition-colors duration-200'
                            >
                                {t('consent.privacyNotice')}
                            </Link>
                            {t('consent.suffix')}
                            <Link
                                href='/privacy'
                                className='text-purple-400 hover:text-purple-300 underline transition-colors duration-200'
                            >
                                {t('consent.learnMore')}
                            </Link>
                            {t('consent.suffix2')}
                        </p>
                    </div>

                    <div
                        className={`max-w-2xl mx-auto mb-10 transition-all duration-700 delay-300 ${
                            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                        }`}
                    >
                        <div className='bg-slate-800/60 backdrop-blur-sm border border-purple-500/40 rounded-xl p-5 md:p-8 hover:border-purple-400/60 transition-all duration-300'>
                            <StandardFileUpload
                                onFileSelect={handleFileSelect}
                                onUpload={handleUpload}
                                isUploading={isScanning}
                                uploadProgress={chunkedUpload.progress}
                                useChunkedUpload={useChunkedUploadForFile}
                                maxFileSize={MAX_FILE_SIZE}
                                acceptedFileTypes={['.dll']}
                                disabled={isScanning}
                                className='text-white'
                                uploadStatus={chunkedUpload.status}
                                isPreparing={chunkedUpload.isPreparing}
                            />

                            {error && (
                                <div className='mt-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg'>
                                    <div className='flex items-center'>
                                        <svg
                                            className='w-5 h-5 text-red-400 mr-2'
                                            fill='currentColor'
                                            viewBox='0 0 20 20'
                                        >
                                            <path
                                                fillRule='evenodd'
                                                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                                                clipRule='evenodd'
                                            />
                                        </svg>
                                        <span className='text-red-300'>{error}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoadingAnalytics ? (
                        <div
                            className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto transition-all duration-700 delay-400 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className='bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg p-5 md:p-6 overflow-hidden'
                                >
                                    <div className='h-10 bg-slate-700/50 rounded mb-2 w-3/4 animate-shimmer'></div>
                                    <div className='h-5 bg-slate-700/50 rounded w-full animate-shimmer'></div>
                                </div>
                            ))}
                        </div>
                    ) : systemAnalytics ? (
                        <>
                            <div
                                className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto transition-all duration-700 delay-400 ${
                                    isLoaded
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-10 opacity-0'
                                }`}
                            >
                                <div className='group bg-gradient-to-br from-slate-800/60 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5 md:p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 cursor-default'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div className='w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors'>
                                            <svg
                                                className='w-5 h-5 text-purple-400'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                                aria-hidden='true'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                                />
                                            </svg>
                                        </div>
                                        <div className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                                            {systemAnalytics.totalFilesScanned.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className='text-sm md:text-base text-gray-300 font-medium'>
                                        {t('stats.checkedPlugins')}
                                    </div>
                                </div>
                                <div className='group bg-gradient-to-br from-slate-800/60 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5 md:p-6 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 cursor-default'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div className='w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors'>
                                            <svg
                                                className='w-5 h-5 text-red-400'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                                aria-hidden='true'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                                />
                                            </svg>
                                        </div>
                                        <div className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent'>
                                            {systemAnalytics.totalThreatsDetected.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className='text-sm md:text-base text-gray-300 font-medium'>
                                        {t('stats.threatsDetected')}
                                    </div>
                                </div>
                                <div className='group bg-gradient-to-br from-slate-800/60 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5 md:p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:scale-105 cursor-default'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div className='w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors'>
                                            <svg
                                                className='w-5 h-5 text-green-400'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                                aria-hidden='true'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M13 10V3L4 14h7v7l9-11h-7z'
                                                />
                                            </svg>
                                        </div>
                                        <div className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                                            {formatScanTime(systemAnalytics.averageScanTimeMs, t)}
                                        </div>
                                    </div>
                                    <div className='text-sm md:text-base text-gray-300 font-medium'>
                                        {t('stats.averageScanTime')}
                                    </div>
                                </div>
                            </div>

                            {systemAnalytics.lastUpdated && (
                                <div className='mt-4 text-center'>
                                    <p className='text-xs text-gray-400'>
                                        {t('analytics.lastUpdated')}:{' '}
                                        {new Date(systemAnalytics.lastUpdated).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </section>

            <section id='features' className='px-6 py-16 md:py-24 bg-slate-800/10'>
                <div className='max-w-6xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16'>
                        {t('features.title')}
                    </h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'>
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-purple-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-5 h-5 md:w-6 md:h-6 text-white'
                                    fill='currentColor'
                                    viewBox='0 0 20 20'
                                >
                                    <path
                                        fillRule='evenodd'
                                        d='M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z'
                                        clipRule='evenodd'
                                    />
                                </svg>
                            </div>
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('features.codeAnalysis')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('features.codeAnalysisDescription')}
                            </p>
                        </div>
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-pink-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-pink-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-5 h-5 md:w-6 md:h-6 text-white'
                                    fill='currentColor'
                                    viewBox='0 0 20 20'
                                >
                                    <path
                                        fillRule='evenodd'
                                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                                        clipRule='evenodd'
                                    />
                                </svg>
                            </div>
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('features.threatDetection')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('features.threatDetectionDescription')}
                            </p>
                        </div>
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-green-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-5 h-5 md:w-6 md:h-6 text-white'
                                    fill='currentColor'
                                    viewBox='0 0 20 20'
                                >
                                    <path
                                        fillRule='evenodd'
                                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                        clipRule='evenodd'
                                    />
                                </svg>
                            </div>
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('features.fastCheck')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('features.fastCheckDescription')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id='how-it-works' className='px-6 py-16 md:py-24'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16'>
                        {t('howItWorks.title')}
                    </h2>
                    <div className='space-y-8 md:space-y-10'>
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-purple-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                1
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('howItWorks.step1.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('howItWorks.step1.description')}
                                </p>
                            </div>
                        </div>
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-pink-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                2
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('howItWorks.step2.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('howItWorks.step2.description')}
                                </p>
                            </div>
                        </div>
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                3
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('howItWorks.step3.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('howItWorks.step3.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <BackToTop />
            <Footer />
        </div>
    );
}
