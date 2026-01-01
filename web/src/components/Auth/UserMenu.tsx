'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api-client';

const PLAN_NAMES = ['Free', 'Verified', 'Premium'];
const PLAN_COLORS = {
    0: 'text-slate-400',
    1: 'text-blue-400',
    2: 'text-purple-400',
};

export default function UserMenu() {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const [threatCount, setThreatCount] = useState<number | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            const fetchThreatCount = async () => {
                try {
                    const stats = await api.get<{ threatsDetected: number }>(
                        'users/me/scans/stats'
                    );
                    setThreatCount(stats.threatsDetected || 0);
                } catch (error) {
                    console.error('Failed to fetch threat count:', error);
                }
            };

            fetchThreatCount();
        }
    }, [isAuthenticated, user]);

    useLayoutEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isUserButton = (target as Element).closest('[data-user-button]');
            const isDropdown = dropdownRef.current?.contains(target);

            if (!isUserButton && !isDropdown) {
                setIsOpen(false);
            }
        };

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        if (isOpen) {
            timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (isLoading) {
        if (user) {
            return (
                <div className='flex items-center gap-3 px-3 py-2 rounded-lg self-center'>
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.username || user.email || 'User'}
                            width={32}
                            height={32}
                            className='w-8 h-8 rounded-full object-cover flex-shrink-0'
                            priority
                            unoptimized
                        />
                    ) : (
                        <div className='w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0'>
                            {(user.username || user.email || 'U')[0].toUpperCase()}
                        </div>
                    )}
                    <span className='text-slate-300'>{user.username || user.email || 'User'}</span>
                </div>
            );
        }
        return null;
    }

    if (!isAuthenticated || !user) {
        return (
            <Link
                href='/login'
                className='bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
            >
                {t('menu.login', 'Login')}
            </Link>
        );
    }

    const planName = PLAN_NAMES[user.tier] || 'Free';
    const planColor = PLAN_COLORS[user.tier as keyof typeof PLAN_COLORS] || 'text-slate-400';

    return (
        <div className='relative' ref={menuRef}>
            <button
                ref={buttonRef}
                data-user-button
                onClick={() => setIsOpen(!isOpen)}
                className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors self-center'
            >
                {user.avatarUrl ? (
                    <Image
                        src={user.avatarUrl}
                        alt={user.username || user.email || 'User'}
                        width={32}
                        height={32}
                        className='w-8 h-8 rounded-full object-cover flex-shrink-0'
                        priority
                        unoptimized
                    />
                ) : (
                    <div className='w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0'>
                        {user.username?.charAt(0).toUpperCase() ||
                            user.email?.charAt(0).toUpperCase() ||
                            'U'}
                    </div>
                )}

                <div className='hidden md:block text-left'>
                    <div className='text-sm font-medium text-white'>
                        {user.username || user.email?.split('@')[0] || 'User'}
                    </div>
                    <div className={`text-xs ${planColor} mt-1`}>{planName}</div>
                </div>

                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

            {isOpen &&
                isMounted &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className='fixed w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-[999999]'
                        style={{
                            top: `${dropdownPosition.top}px`,
                            right: `${dropdownPosition.right}px`,
                        }}
                    >
                        <div className='px-4 py-3 border-b border-slate-700'>
                            <div className='font-medium text-white'>{user.username || 'User'}</div>
                            <div className='flex items-center gap-2 mt-2'>
                                <span className={`text-xs ${planColor}`}>{planName}</span>
                                {user.isAdmin && (
                                    <span className='text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-semibold'>
                                        👑 Admin
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className='py-2'>
                            <Link
                                href='/dashboard'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                                        />
                                    </svg>
                                    <span>{t('menu.dashboard')}</span>
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/api-keys'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                                        />
                                    </svg>
                                    <span>{t('menu.apiKeys')}</span>
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/badges'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
                                        />
                                    </svg>
                                    <span>Badges</span>
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/scans'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                    <span>{t('menu.scanHistory')}</span>
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/usage'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                                        />
                                    </svg>
                                    <span>{t('menu.usage')}</span>
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/notifications'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer relative'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                                        />
                                    </svg>
                                    <span>{t('menu.notifications')}</span>
                                    {threatCount !== null && threatCount > 0 && (
                                        <span className='ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center'>
                                            {threatCount > 99 ? '99+' : threatCount}
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <Link
                                href='/dashboard/loader'
                                className='block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                            >
                                <div className='flex items-center gap-3'>
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
                                    <span>{t('loader.title')}</span>
                                </div>
                            </Link>

                            {user.isAdmin && (
                                <>
                                    <div className='border-t border-slate-700 my-2'></div>
                                    <Link
                                        href='/admin'
                                        className='block px-4 py-2 text-sm text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors cursor-pointer'
                                        onClick={e => {
                                            e.stopPropagation();
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className='flex items-center gap-3'>
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
                                                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                                                />
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                                                />
                                            </svg>
                                            <span>{t('menu.adminPanel')}</span>
                                        </div>
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className='border-t border-slate-700 pt-2'>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    logout();
                                }}
                                className='w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer'
                            >
                                <div className='flex items-center gap-3'>
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
                                            d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                                        />
                                    </svg>
                                    <span>{t('menu.logout')}</span>
                                </div>
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
