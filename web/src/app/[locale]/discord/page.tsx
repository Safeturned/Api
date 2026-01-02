'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import DiscordIcon from '@/components/Icons/DiscordIcon';
import { DISCORD_BOT_CONFIG, BOT_COMMANDS, BOT_PERMISSIONS } from '@/lib/discordConfig';

export default function DiscordBotPage() {
    const { t } = useTranslation();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = requestAnimationFrame(() => setIsLoaded(true));
        document.documentElement.style.scrollBehavior = 'smooth';

        return () => {
            cancelAnimationFrame(timer);
            document.documentElement.style.scrollBehavior = 'auto';
        };
    }, []);

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative'>
            <Navigation />

            {/* Hero Section */}
            <section className='px-6 py-12 md:py-20'>
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
                                <DiscordIcon className='w-4 h-4' />
                                <span>{t('discord.hero.badge')}</span>
                            </div>
                        </div>
                        <h1
                            className={`text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white transition-all duration-700 delay-100 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            <span className='bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent'>
                                {t('discord.hero.title')}
                            </span>
                        </h1>
                        <p
                            className={`text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            {t('discord.hero.subtitle')}
                        </p>

                        {/* CTA Buttons */}
                        <div
                            className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-700 delay-300 ${
                                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}
                        >
                            <a
                                href={DISCORD_BOT_CONFIG.inviteUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105'
                            >
                                <DiscordIcon className='w-6 h-6' />
                                {t('discord.hero.addToDiscord')}
                            </a>
                            <a
                                href={DISCORD_BOT_CONFIG.communityInvite}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-colors'
                            >
                                {t('discord.hero.joinCommunity')}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id='features' className='px-6 py-16 md:py-24 bg-slate-800/10'>
                <div className='max-w-6xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16'>
                        {t('discord.features.title')}
                    </h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'>
                        {/* Instant Scanning */}
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-purple-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-6 h-6 text-white'
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
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('discord.features.scanning.title')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('discord.features.scanning.description')}
                            </p>
                        </div>

                        {/* Private Channels */}
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-pink-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-pink-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-6 h-6 text-white'
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
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('discord.features.private.title')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('discord.features.private.description')}
                            </p>
                        </div>

                        {/* Server Protection */}
                        <div className='bg-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 md:p-8 hover:bg-slate-800/70 hover:border-green-400/50 transition-all duration-200'>
                            <div className='w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4'>
                                <svg
                                    className='w-6 h-6 text-white'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                                    />
                                </svg>
                            </div>
                            <h3 className='text-lg md:text-xl font-semibold mb-3 text-white'>
                                {t('discord.features.protection.title')}
                            </h3>
                            <p className='text-gray-300 text-sm md:text-base leading-relaxed'>
                                {t('discord.features.protection.description')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Commands Section */}
            <section id='commands' className='px-6 py-16 md:py-24'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16'>
                        {t('discord.commands.title')}
                    </h2>
                    <div className='space-y-4'>
                        {BOT_COMMANDS.map(command => (
                            <div
                                key={command.name}
                                className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-5 md:p-6 hover:border-purple-500/30 transition-colors'
                            >
                                <div className='flex flex-wrap items-center gap-3 mb-3'>
                                    <code className='text-purple-400 font-mono text-lg font-semibold'>
                                        {command.name}
                                    </code>
                                    <span
                                        className={`px-2 py-0.5 text-xs rounded ${
                                            command.adminOnly
                                                ? 'bg-orange-500/20 text-orange-400'
                                                : 'bg-green-500/20 text-green-400'
                                        }`}
                                    >
                                        {command.adminOnly
                                            ? t('discord.commands.adminBadge')
                                            : t('discord.commands.everyoneBadge')}
                                    </span>
                                </div>
                                <p className='text-gray-300 text-sm md:text-base'>
                                    {t(`${command.translationKey}.description`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Setup Guide Section */}
            <section id='setup' className='px-6 py-16 md:py-24 bg-slate-800/10'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16'>
                        {t('discord.setup.title')}
                    </h2>
                    <div className='space-y-8 md:space-y-10'>
                        {/* Step 1 */}
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-purple-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                1
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('discord.setup.step1.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('discord.setup.step1.description')}
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-pink-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                2
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('discord.setup.step2.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('discord.setup.step2.description')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className='flex flex-col md:flex-row items-center gap-6 md:gap-8'>
                            <div className='w-14 h-14 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0'>
                                3
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-xl md:text-2xl font-semibold mb-2 text-white'>
                                    {t('discord.setup.step3.title')}
                                </h3>
                                <p className='text-gray-300 text-base md:text-lg leading-relaxed'>
                                    {t('discord.setup.step3.description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* API Key CTA */}
                    <div className='mt-12 text-center'>
                        <p className='text-gray-400 mb-4'>{t('discord.setup.needApiKey')}</p>
                        <Link
                            href='/dashboard/api-keys'
                            className='inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors'
                        >
                            {t('discord.setup.createApiKey')}
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
            </section>

            {/* Permissions Section */}
            <section id='permissions' className='px-6 py-16 md:py-24'>
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-3xl md:text-4xl font-bold text-center mb-4'>
                        {t('discord.permissions.title')}
                    </h2>
                    <p className='text-gray-400 text-center mb-12 max-w-2xl mx-auto'>
                        {t('discord.permissions.description')}
                    </p>
                    <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden'>
                        <div className='divide-y divide-slate-700/50'>
                            {BOT_PERMISSIONS.map((permission, index) => (
                                <div
                                    key={index}
                                    className='flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4 md:p-5'
                                >
                                    <div className='font-medium text-white md:w-48 flex-shrink-0'>
                                        {t(permission.nameKey)}
                                    </div>
                                    <div className='text-gray-400 text-sm md:text-base'>
                                        {t(permission.reasonKey)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA Section */}
            <section className='px-6 py-16 md:py-24 bg-gradient-to-t from-purple-900/20 to-transparent'>
                <div className='max-w-4xl mx-auto text-center'>
                    <h2 className='text-3xl md:text-4xl font-bold mb-4'>
                        {t('discord.cta.title')}
                    </h2>
                    <p className='text-gray-400 text-lg mb-8'>{t('discord.cta.subtitle')}</p>
                    <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
                        <a
                            href={DISCORD_BOT_CONFIG.inviteUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105'
                        >
                            <DiscordIcon className='w-6 h-6' />
                            {t('discord.hero.addToDiscord')}
                        </a>
                        <Link
                            href='/docs'
                            className='inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors'
                        >
                            {t('discord.cta.docsLink')}
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
            </section>

            <BackToTop />
            <Footer />
        </div>
    );
}
