'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { DiscordIcon, SteamIcon } from '@/components/Icons';
import { getApiUrl } from '@/lib/api-client';
import { useTranslation } from '@/hooks/useTranslation';

function validateReturnUrl(url: string | null): string {
    const defaultUrl = '/dashboard';

    if (!url) {
        return defaultUrl;
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        if (!decodedUrl.startsWith('/')) {
            return defaultUrl;
        }

        if (decodedUrl.match(/^\/[/\\]/)) {
            return defaultUrl;
        }

        if (decodedUrl.toLowerCase().startsWith('/login')) {
            return defaultUrl;
        }

        if (decodedUrl.includes(':') || decodedUrl.includes('//') || decodedUrl.includes('\\\\')) {
            return defaultUrl;
        }

        return decodedUrl;
    } catch {
        return defaultUrl;
    }
}

export default function LoginForm() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const rawReturnUrl = searchParams.get('returnUrl');
    const returnUrl = validateReturnUrl(rawReturnUrl);

    useEffect(() => {
        if (rawReturnUrl && rawReturnUrl !== returnUrl) {
            const url = new URL(window.location.href);
            url.searchParams.delete('returnUrl');
            window.history.replaceState({}, '', url.toString());
        }
    }, [rawReturnUrl, returnUrl]);

    const handleDiscordLogin = () => {
        sessionStorage.setItem('auth_return_url', returnUrl);
        window.location.href = `${getApiUrl('auth/discord')}?returnUrl=${encodeURIComponent(returnUrl)}`;
    };

    const handleSteamLogin = () => {
        sessionStorage.setItem('auth_return_url', returnUrl);
        window.location.href = `${getApiUrl('auth/steam')}?returnUrl=${encodeURIComponent(returnUrl)}`;
    };

    return (
        <div className='w-full max-w-md'>
            <div className='bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700/50'>
                <div className='text-center mb-8'>
                    <h1 className='text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2'>
                        Safeturned
                    </h1>
                    <p className='text-slate-400 text-sm'>{t('login.title')}</p>
                </div>

                <div className='space-y-3'>
                    <button
                        onClick={handleDiscordLogin}
                        className='w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105'
                    >
                        <DiscordIcon />
                        {t('login.loginWithDiscord')}
                    </button>

                    <button
                        onClick={handleSteamLogin}
                        className='w-full bg-gradient-to-r from-[#1b2838] to-[#2a475e] hover:from-[#171f2b] hover:to-[#1e3447] text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105'
                    >
                        <SteamIcon />
                        {t('login.loginWithSteam')}
                    </button>
                </div>

                <div className='relative my-8'>
                    <div className='absolute inset-0 flex items-center'>
                        <div className='w-full border-t border-slate-700'></div>
                    </div>
                    <div className='relative flex justify-center text-sm'>
                        <span className='px-4 bg-slate-800 text-slate-400'>{t('login.or')}</span>
                    </div>
                </div>

                <Link
                    href='/'
                    className='block w-full text-center bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors duration-200'
                >
                    {t('login.continueGuest')}
                </Link>

                <div className='mt-8 text-center'>
                    <p className='text-slate-500 text-xs'>
                        {t('login.agreeTerms')}{' '}
                        <Link
                            href='/terms'
                            className='text-purple-400 hover:text-purple-300 underline'
                        >
                            {t('login.termsOfService')}
                        </Link>{' '}
                        {t('login.and')}{' '}
                        <Link
                            href='/privacy'
                            className='text-purple-400 hover:text-purple-300 underline'
                        >
                            {t('login.privacyPolicy')}
                        </Link>
                    </p>
                </div>

                <div className='mt-8 space-y-3'>
                    <p className='text-slate-400 text-sm font-medium text-center mb-4'>
                        {t('login.whyCreate')}
                    </p>
                    <div className='flex items-start gap-3 text-sm text-slate-400'>
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
                                d='M5 13l4 4L19 7'
                            />
                        </svg>
                        <span>{t('login.manageKeys')}</span>
                    </div>
                    <div className='flex items-start gap-3 text-sm text-slate-400'>
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
                                d='M5 13l4 4L19 7'
                            />
                        </svg>
                        <span>{t('login.viewHistory')}</span>
                    </div>
                    <div className='flex items-start gap-3 text-sm text-slate-400'>
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
                                d='M5 13l4 4L19 7'
                            />
                        </svg>
                        <span>{t('login.higherLimits')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
