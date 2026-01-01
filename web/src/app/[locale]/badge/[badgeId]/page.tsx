'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { encodeHashForUrl } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/dateUtils';
import { api } from '@/lib/api-client';
import LoadingPage from '@/components/LoadingPage';

interface Badge {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    linkedFileHash: string;
    requireTokenForUpdate: boolean;
    versionUpdateCount: number;
    linkedFile: {
        hash: string;
        fileName: string;
        score: number;
        lastScanned: string;
    } | null;
}

function getRiskColor(score: number): string {
    if (score >= 75) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-green-400';
}

function getRiskBgColor(score: number): string {
    if (score >= 75) return 'bg-red-900/20 border-red-500/30';
    if (score >= 50) return 'bg-orange-900/20 border-orange-500/30';
    if (score >= 25) return 'bg-yellow-900/20 border-yellow-500/30';
    return 'bg-green-900/20 border-green-500/30';
}

function getRiskLabel(score: number): string {
    if (score >= 75) return 'High Risk';
    if (score >= 50) return 'Moderate Risk';
    if (score >= 25) return 'Low Risk';
    return 'Safe';
}

export default function BadgeInfoPage() {
    const params = useParams();
    const badgeId = params.badgeId as string;
    const { t, locale } = useTranslation();
    const [badge, setBadge] = useState<Badge | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    useEffect(() => {
        const fetchBadge = async () => {
            try {
                const data = await api.get<Badge>(`badges/${badgeId}`);
                setBadge(data);
            } catch (error) {
                console.error('Failed to fetch badge:', error);
                setBadge(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBadge();
    }, [badgeId]);

    if (loading) {
        return <LoadingPage text={t('common.loading')} />;
    }

    if (!badge || !badge.linkedFile) {
        notFound();
    }

    const encodedHash = encodeHashForUrl(badge.linkedFile.hash);
    const resultUrl = `/result/${encodedHash}`;
    const badgeImageUrl = `/api/v1.0/badge/${badge.id}`;

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <div className='max-w-4xl mx-auto px-6 py-12'>
                <Link
                    href='/'
                    className='inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-8'
                >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M10 19l-7-7m0 0l7-7m-7 7h18'
                        />
                    </svg>
                    {t('badgeInfo.backToHome')}
                </Link>

                <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8'>
                    <div className='flex items-start gap-4 mb-6'>
                        <div className='w-16 h-16 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0'>
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
                                    d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                />
                            </svg>
                        </div>
                        <div className='flex-1'>
                            <h1 className='text-3xl font-bold mb-2'>{badge.name}</h1>
                            {badge.description && (
                                <p className='text-slate-300 text-lg'>{badge.description}</p>
                            )}
                        </div>
                    </div>

                    <div className='mb-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-5'>
                        <h2 className='text-blue-300 font-semibold mb-3 flex items-center gap-2'>
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
                                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                            </svg>
                            {t('badgeInfo.badgeVerification')}
                        </h2>
                        <p className='text-slate-300 text-sm mb-3'>
                            {t('badgeInfo.verificationDescription')}
                        </p>
                        <div className='bg-blue-900/30 border border-blue-400/20 rounded-lg p-3 mt-3'>
                            <p className='text-blue-200 text-xs flex items-start gap-2'>
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
                                <span>
                                    <strong>💡 Quick Tip:</strong> Add{' '}
                                    <code className='bg-blue-950/50 px-1.5 py-0.5 rounded text-blue-300'>
                                        /info
                                    </code>{' '}
                                    to any badge URL to view this verification page. Example:{' '}
                                    <code className='bg-blue-950/50 px-1.5 py-0.5 rounded text-blue-300 text-[10px]'>
                                        /api/v1.0/badge/{badge.id}/info
                                    </code>
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className='space-y-6'>
                        <div>
                            <h3 className='text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3'>
                                {t('badgeInfo.badgePreview')}
                            </h3>
                            <div className='bg-slate-900/50 rounded-lg p-6 border border-slate-700'>
                                <Image
                                    src={badgeImageUrl}
                                    alt={badge.name}
                                    width={200}
                                    height={20}
                                    className='inline-block'
                                    unoptimized
                                    onError={e => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className='text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3'>
                                {t('badgeInfo.linkedFile')}
                            </h3>
                            <div className='bg-slate-900/50 rounded-lg p-6 border border-slate-700 space-y-4'>
                                <div>
                                    <p className='text-sm text-slate-400 mb-1'>
                                        {t('badgeInfo.fileName')}
                                    </p>
                                    <p className='text-white font-mono text-lg'>
                                        {badge.linkedFile.fileName}
                                    </p>
                                </div>
                                <div>
                                    <div className='flex items-center justify-between mb-2'>
                                        <p className='text-sm text-slate-400'>
                                            {t('badgeInfo.fileHash')}
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (badge?.linkedFile?.hash) {
                                                    navigator.clipboard.writeText(
                                                        badge.linkedFile.hash
                                                    );
                                                    setCopiedHash(true);
                                                    setTimeout(() => setCopiedHash(false), 2000);
                                                }
                                            }}
                                            className='text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors flex items-center gap-1'
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
                                                    {t('badgeInfo.copied')}
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
                                                    {t('badgeInfo.copyHash')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className='text-slate-300 font-mono text-sm bg-slate-800 p-3 rounded border border-slate-600 break-all'>
                                        {badge.linkedFile.hash}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-sm text-slate-400 mb-1'>
                                        {t('badgeInfo.lastScanned')}
                                    </p>
                                    <p className='text-white'>
                                        {formatDateTime(badge.linkedFile.lastScanned, locale)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='bg-amber-900/20 border border-amber-500/30 rounded-lg p-5'>
                            <h3 className='text-amber-300 font-semibold mb-3 flex items-center gap-2'>
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
                                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                    />
                                </svg>
                                {t('badgeInfo.howToVerify')}
                            </h3>
                            <div className='text-slate-300 text-sm space-y-3'>
                                <p>{t('badgeInfo.verificationSteps.intro')}</p>
                                <ol className='list-decimal list-inside space-y-2 ml-2'>
                                    <li>
                                        {t('badgeInfo.verificationSteps.step1', undefined, {
                                            fileName: badge.linkedFile.fileName,
                                        })}
                                    </li>
                                    <li>
                                        {t('badgeInfo.verificationSteps.step2')}
                                        <ul className='list-disc list-inside ml-6 mt-2 space-y-1 text-slate-400'>
                                            <li>
                                                <strong>
                                                    {t('badgeInfo.verificationSteps.step2Windows')}
                                                </strong>{' '}
                                                <code className='bg-slate-800 px-2 py-0.5 rounded text-xs'>
                                                    certutil -hashfile {badge.linkedFile.fileName}{' '}
                                                    SHA256
                                                </code>
                                            </li>
                                            <li>
                                                <strong>
                                                    {t('badgeInfo.verificationSteps.step2LinuxMac')}
                                                </strong>{' '}
                                                <code className='bg-slate-800 px-2 py-0.5 rounded text-xs'>
                                                    shasum -a 256 {badge.linkedFile.fileName}
                                                </code>
                                            </li>
                                        </ul>
                                    </li>
                                    <li>{t('badgeInfo.verificationSteps.step3')}</li>
                                    <li>{t('badgeInfo.verificationSteps.step4')}</li>
                                    <li>{t('badgeInfo.verificationSteps.step5')}</li>
                                </ol>
                                <p className='text-xs text-slate-400 mt-3'>
                                    💡 <strong>{t('badgeInfo.verificationSteps.tip')}</strong>
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className='text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3'>
                                {t('badgeInfo.securityScore')}
                            </h3>
                            <div
                                className={`rounded-lg p-6 border ${getRiskBgColor(badge.linkedFile.score)}`}
                            >
                                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                    <div className='flex-1'>
                                        <p className='text-sm text-slate-300 mb-2'>
                                            {t('badgeInfo.riskAssessment')}
                                        </p>
                                        <div className='flex items-baseline gap-3'>
                                            <p
                                                className={`text-5xl font-bold ${getRiskColor(badge.linkedFile.score)}`}
                                            >
                                                {badge.linkedFile.score}
                                            </p>
                                            <p className='text-2xl text-slate-400'>/100</p>
                                        </div>
                                        <p
                                            className={`text-lg font-semibold mt-2 ${getRiskColor(badge.linkedFile.score)}`}
                                        >
                                            {getRiskLabel(badge.linkedFile.score)}
                                        </p>
                                        {/* Progress bar */}
                                        <div className='mt-4 w-full bg-slate-700 rounded-full h-2 overflow-hidden'>
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    badge.linkedFile.score >= 75
                                                        ? 'bg-red-500'
                                                        : badge.linkedFile.score >= 50
                                                          ? 'bg-orange-500'
                                                          : badge.linkedFile.score >= 25
                                                            ? 'bg-yellow-500'
                                                            : 'bg-green-500'
                                                }`}
                                                style={{
                                                    width: `${Math.max(2, badge.linkedFile.score)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Link
                                        href={resultUrl}
                                        className='bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105 whitespace-nowrap inline-flex items-center justify-center gap-2'
                                    >
                                        {t('badgeInfo.viewFullReport')}
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
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className='text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3'>
                                {t('badgeInfo.badgeDetails')}
                            </h3>
                            <div className='bg-slate-900/50 rounded-lg p-6 border border-slate-700 space-y-3'>
                                <div className='flex justify-between items-center'>
                                    <p className='text-slate-400'>{t('badgeInfo.badgeId')}</p>
                                    <p className='text-white font-mono'>{badge.id}</p>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <p className='text-slate-400'>{t('badgeInfo.created')}</p>
                                    <p className='text-white'>
                                        {new Date(badge.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <p className='text-slate-400'>{t('badgeInfo.lastUpdated')}</p>
                                    <p className='text-white'>
                                        {new Date(badge.updatedAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <p className='text-slate-400'>{t('badgeInfo.autoUpdate')}</p>
                                    <p className='text-white'>
                                        {badge.requireTokenForUpdate ? (
                                            <span className='inline-flex items-center gap-1 text-green-400'>
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
                                                        d='M5 13l4 4L19 7'
                                                    />
                                                </svg>
                                                {t('badgeInfo.enabled')}
                                            </span>
                                        ) : (
                                            <span className='text-slate-500'>
                                                {t('badgeInfo.disabled')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                {badge.versionUpdateCount > 0 && (
                                    <div className='flex justify-between items-center'>
                                        <p className='text-slate-400'>
                                            {t('badgeInfo.versionUpdates')}
                                        </p>
                                        <p className='text-purple-400 font-semibold'>
                                            {badge.versionUpdateCount}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-5'>
                            <h3 className='text-green-300 font-semibold mb-2 flex items-center gap-2'>
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
                                        d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                    />
                                </svg>
                                {t('badgeInfo.verifiedBy')}
                            </h3>
                            <p className='text-slate-300 text-sm'>
                                {t('badgeInfo.verifiedDescription')}
                            </p>
                        </div>

                        <div className='bg-slate-900/50 border border-slate-700 rounded-lg p-5'>
                            <h3 className='text-slate-300 font-semibold mb-3'>
                                {t('badgeInfo.shareUrl')}
                            </h3>
                            <div className='flex gap-2'>
                                <input
                                    type='text'
                                    readOnly
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/badge/${badge.id}`}
                                    className='flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 font-mono text-sm'
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            `${window.location.origin}/badge/${badge.id}`
                                        );
                                        setCopiedUrl(true);
                                        setTimeout(() => setCopiedUrl(false), 2000);
                                    }}
                                    className='px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2'
                                >
                                    {copiedUrl ? (
                                        <>
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
                                                    d='M5 13l4 4L19 7'
                                                />
                                            </svg>
                                            {t('badgeInfo.copied')}
                                        </>
                                    ) : (
                                        <>
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
                                                    d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                                />
                                            </svg>
                                            {t('badgeInfo.copy')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
