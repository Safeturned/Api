'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface OperationLimit {
    operation: string;
    current: number;
    limit: number;
    remaining: number;
    usagePercent: number;
    resetTime: string;
    isNearLimit: boolean;
    isOverLimit: boolean;
}

interface RateLimitDataV2 {
    tier: number;
    tierName: string;
    isAdmin: boolean;
    hasApiKeys: boolean;
    operations: OperationLimit[];
}

export default function RateLimitUsage() {
    const { isAuthenticated } = useAuth();
    const { t } = useTranslation();
    const [rateLimitData, setRateLimitData] = useState<RateLimitDataV2 | null>(null);
    const [loading, setLoading] = useState(true);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const fetchRateLimitData = useCallback(async () => {
        try {
            const data = await api.get<RateLimitDataV2>('users/me/usage/rate-limit');
            setRateLimitData(data);
        } catch (err) {
            console.error('Failed to fetch rate limit data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRateLimitData();
            const fetchInterval = setInterval(fetchRateLimitData, 60000);
            const displayInterval = setInterval(() => setUpdateTrigger(prev => prev + 1), 10000);
            return () => {
                clearInterval(fetchInterval);
                clearInterval(displayInterval);
            };
        }
    }, [isAuthenticated, fetchRateLimitData]);

    const getResetTimeDisplay = useCallback(
        (resetTime: string) => {
            const resetDate = new Date(resetTime);
            const now = new Date();
            const diffMs = resetDate.getTime() - now.getTime();

            if (diffMs <= 0) {
                return t('dashboard.rateLimits.resettingNow');
            }

            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const remainingMinutes = diffMinutes % 60;
            const remainingSeconds = diffSeconds % 60;

            if (diffHours > 0) {
                return `${diffHours}h ${remainingMinutes}m`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes}m ${remainingSeconds}s`;
            } else {
                return `${remainingSeconds}s`;
            }
        },
        [updateTrigger, t]
    );

    if (loading) {
        return (
            <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 animate-pulse'>
                <div className='h-4 bg-slate-700 rounded w-1/3 mb-4'></div>
                <div className='space-y-3'>
                    <div className='h-16 bg-slate-700 rounded'></div>
                    <div className='h-16 bg-slate-700 rounded'></div>
                    <div className='h-16 bg-slate-700 rounded'></div>
                </div>
            </div>
        );
    }

    if (!rateLimitData || !rateLimitData.hasApiKeys) {
        return null;
    }

    const isAdmin = rateLimitData.isAdmin;

    const getOperationIcon = (operation: string) => {
        switch (operation) {
            case 'Read':
                return (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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
                );
            case 'Write':
                return (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                        />
                    </svg>
                );
            case 'Expensive':
                return (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                        />
                    </svg>
                );
            case 'FilesUpload':
                return (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getOperationColor = (operation: OperationLimit) => {
        if (operation.isOverLimit) {
            return {
                progress: 'bg-red-500',
                text: 'text-red-400',
                border: 'border-red-500/30',
                bg: 'bg-red-500/5',
            };
        }
        if (operation.isNearLimit) {
            return {
                progress: 'bg-orange-500',
                text: 'text-orange-400',
                border: 'border-orange-500/30',
                bg: 'bg-orange-500/5',
            };
        }
        if (operation.usagePercent >= 50) {
            return {
                progress: 'bg-yellow-500',
                text: 'text-yellow-400',
                border: 'border-yellow-500/30',
                bg: 'bg-yellow-500/5',
            };
        }
        return {
            progress: 'bg-green-500',
            text: 'text-green-400',
            border: 'border-green-500/30',
            bg: 'bg-green-500/5',
        };
    };

    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'>
            <div className='flex items-center justify-between mb-4'>
                <div>
                    <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
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
                                d='M13 10V3L4 14h7v7l9-11h-7z'
                            />
                        </svg>
                        {t('dashboard.rateLimits.title')}
                    </h3>
                    <p className='text-sm text-slate-400 mt-1'>
                        {isAdmin
                            ? t('dashboard.rateLimits.adminUnlimited')
                            : `${rateLimitData.tierName} tier (hourly limits)`}
                    </p>
                </div>
                <Link
                    href='/dashboard/usage'
                    className='text-xs text-purple-400 hover:text-purple-300 underline'
                >
                    {t('dashboard.rateLimits.viewAnalytics')}
                </Link>
            </div>

            {isAdmin ? (
                <div className='mt-4 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg'>
                    <p className='text-purple-300 text-sm font-medium flex items-center gap-2'>
                        <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                            <path
                                fillRule='evenodd'
                                d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z'
                                clipRule='evenodd'
                            />
                        </svg>
                        {t('dashboard.rateLimits.noRateLimits')}
                    </p>
                    <p className='text-purple-400 text-xs mt-1'>
                        {t('dashboard.rateLimits.unlimitedRequests')}
                    </p>
                </div>
            ) : (
                <div className='space-y-3'>
                    {rateLimitData.operations
                        .filter(op => op.operation !== 'Exceptions' && op.operation !== 'Expensive')
                        .map((op, index) => {
                            const colors = getOperationColor(op);
                            return (
                                <div
                                    key={index}
                                    className={`border ${colors.border} ${colors.bg} rounded-lg p-3`}
                                >
                                    <div className='flex items-center justify-between mb-2'>
                                        <div className='flex items-center gap-2'>
                                            <div className='text-slate-400'>
                                                {getOperationIcon(op.operation)}
                                            </div>
                                            <div>
                                                <div className='text-sm font-medium text-white'>
                                                    {op.operation === 'FilesUpload'
                                                        ? 'File Uploads'
                                                        : `${op.operation} Operations`}
                                                </div>
                                                <div className='text-xs text-slate-500'>
                                                    {op.operation === 'Read' && 'GET requests'}
                                                    {op.operation === 'Write' &&
                                                        'POST, PUT, DELETE, PATCH'}
                                                    {op.operation === 'FilesUpload' &&
                                                        'File operations'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <div className={`text-lg font-bold ${colors.text}`}>
                                                {op.current}/{op.limit}
                                            </div>
                                            <div className='text-xs text-slate-500'>
                                                {op.remaining} {t('dashboard.rateLimits.left')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='w-full bg-slate-700/50 rounded-full h-2 overflow-hidden'>
                                        <div
                                            className={`h-full ${colors.progress} transition-all duration-500 ease-out`}
                                            style={{ width: `${Math.min(op.usagePercent, 100)}%` }}
                                        />
                                    </div>

                                    <div className='mt-2 flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            {op.isOverLimit && (
                                                <div className='text-xs text-red-300'>
                                                    ⚠️ Limit exceeded - requests throttled
                                                </div>
                                            )}
                                            {op.isNearLimit && !op.isOverLimit && (
                                                <div className='text-xs text-orange-300'>
                                                    ⚡ {op.usagePercent.toFixed(0)}% used
                                                </div>
                                            )}
                                        </div>
                                        <div className='text-xs text-slate-500'>
                                            {t('dashboard.rateLimits.resetsIn')}{' '}
                                            {getResetTimeDisplay(op.resetTime)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
