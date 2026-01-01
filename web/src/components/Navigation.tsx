'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserMenu from '@/components/Auth/UserMenu';
import { GitHubIcon, DiscordIcon } from '@/components/Icons';
import { throttle } from '@/lib/utils';

export default function Navigation() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleScroll = useMemo(
        () =>
            throttle(() => {
                setIsScrolled(window.scrollY > 20);
            }, 100),
        []
    );

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <nav
                className={`px-6 py-4 border-b backdrop-blur-sm sticky top-0 z-50 transition-all duration-300 ${
                    isScrolled
                        ? 'bg-slate-900/95 border-purple-800/50 shadow-lg shadow-purple-900/20'
                        : 'bg-transparent border-purple-800/20'
                }`}
            >
                <div className='max-w-7xl mx-auto flex justify-between items-center'>
                    {pathname === '/' ? (
                        <div className='flex items-center space-x-3'>
                            <div className='w-10 h-10 select-none flex-shrink-0'>
                                <Image
                                    src='/favicon.jpg'
                                    alt='Safeturned Logo'
                                    width={40}
                                    height={40}
                                    className='w-full h-full object-contain rounded-lg pointer-events-none'
                                    draggable={false}
                                    onContextMenu={e => e.preventDefault()}
                                    onDragStart={e => e.preventDefault()}
                                />
                            </div>
                            <span className='text-xl font-bold whitespace-nowrap text-white'>
                                {t('hero.title')}
                            </span>
                        </div>
                    ) : (
                        <Link
                            href='/'
                            className='flex items-center space-x-3 hover:opacity-80 transition-opacity'
                            aria-label={t('nav.backToHome')}
                        >
                            <div className='w-10 h-10 select-none flex-shrink-0'>
                                <Image
                                    src='/favicon.jpg'
                                    alt='Safeturned Logo'
                                    width={40}
                                    height={40}
                                    className='w-full h-full object-contain rounded-lg pointer-events-none'
                                    draggable={false}
                                    onContextMenu={e => e.preventDefault()}
                                    onDragStart={e => e.preventDefault()}
                                />
                            </div>
                            <span className='text-xl font-bold whitespace-nowrap text-white'>
                                {t('hero.title')}
                            </span>
                        </Link>
                    )}
                    <div className='flex-1' />
                    <div className='hidden md:flex items-center space-x-3 md:space-x-5'>
                        <Link
                            href='/docs'
                            className='flex items-center gap-1.5 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md px-2 py-1'
                            title={t('nav.apiDocumentation')}
                            aria-label={t('nav.apiDocumentation')}
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
                                    d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
                                />
                            </svg>
                            <span className='hidden lg:inline'>{t('nav.docs')}</span>
                        </Link>
                        <a
                            href='https://github.com/Safeturned'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-2 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md px-2 py-1'
                            title={t('nav.githubOrganization')}
                            aria-label={t('nav.githubOrganization')}
                        >
                            <GitHubIcon />
                            <span className='hidden lg:inline'>{t('nav.github')}</span>
                        </a>
                        <a
                            href='https://discord.gg/JAKWGEabhc'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-2 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md px-2 py-1'
                            title={t('nav.joinDiscord')}
                            aria-label={t('nav.joinDiscord')}
                        >
                            <DiscordIcon className='w-5 h-5' />
                            <span className='hidden lg:inline'>{t('nav.discord')}</span>
                        </a>
                        <LanguageSwitcher />
                        <UserMenu />
                    </div>

                    <div className='md:hidden flex items-center space-x-3'>
                        <LanguageSwitcher />
                        <UserMenu />
                        <button
                            onClick={toggleMobileMenu}
                            className='text-gray-300 hover:text-purple-300 transition-colors p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md'
                            aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? (
                                <svg
                                    className='w-6 h-6'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M6 18L18 6M6 6l12 12'
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className='w-6 h-6'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M4 6h16M4 12h16M4 18h16'
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div
                    className='fixed inset-0 z-40 md:hidden'
                    role='dialog'
                    aria-modal='true'
                    aria-label={t('nav.mobileMenu')}
                >
                    <div
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300'
                        onClick={closeMobileMenu}
                        aria-hidden='true'
                    />
                    <div className='fixed top-0 right-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-purple-800/50 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out'>
                        <nav
                            className='flex flex-col p-6 space-y-4 pt-24'
                            onClick={closeMobileMenu}
                        >
                            <Link
                                href='/docs'
                                className='flex items-center gap-3 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-lg py-3 px-4 rounded-lg hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                            >
                                <svg
                                    className='w-5 h-5'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
                                    />
                                </svg>
                                <span>{t('nav.docs')}</span>
                            </Link>
                            <a
                                href='https://github.com/Safeturned'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-lg py-3 px-4 rounded-lg hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                            >
                                <GitHubIcon />
                                <span>{t('nav.github')}</span>
                            </a>
                            <a
                                href='https://discord.gg/JAKWGEabhc'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 text-gray-300 hover:text-purple-300 transition-colors duration-200 text-lg py-3 px-4 rounded-lg hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                            >
                                <DiscordIcon className='w-5 h-5' />
                                <span>{t('nav.discord')}</span>
                            </a>
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
