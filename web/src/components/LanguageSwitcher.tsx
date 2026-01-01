'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../hooks/useTranslation';

const languages: Array<{ code: 'ru' | 'en'; name: string; flag: string }> = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
    const { locale, changeLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                const isLanguageButton = (target as Element).closest('[data-language-button]');
                if (!isLanguageButton) {
                    setIsOpen(false);
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLanguageChange = (langCode: 'ru' | 'en') => {
        changeLanguage(langCode);
        setIsOpen(false);
    };

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (isOpen && dropdownRef.current && isMounted) {
            const updatePosition = () => {
                if (!dropdownRef.current) return;

                const rect = dropdownRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const dropdownWidth = 192;

                let left = rect.right - dropdownWidth;

                if (left < 8) {
                    left = 8;
                }

                if (left + dropdownWidth > viewportWidth - 8) {
                    left = viewportWidth - dropdownWidth - 8;
                }

                setDropdownPosition({
                    top: rect.bottom,
                    left: left,
                    width: rect.width,
                });
            };

            updatePosition();

            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, isMounted]);

    return (
        <div className='relative' ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className='flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-purple-500/30 hover:bg-slate-800/70 hover:border-purple-500/50 transition-all duration-300 text-white'
                title={`Current: ${currentLanguage.name} (${currentLanguage.code})`}
            >
                <span className='text-lg' title='Flag'>
                    {currentLanguage.flag}
                </span>
                <span className='text-sm font-medium hidden sm:inline' title='Language Name'>
                    {currentLanguage.name}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
                        className='fixed w-48 bg-slate-800/90 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-xl z-[999999] max-w-[calc(100vw-2rem)]'
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className='py-1'>
                            {languages.map(language => (
                                <button
                                    key={language.code}
                                    data-language-button
                                    onClick={() => handleLanguageChange(language.code)}
                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-purple-500/20 transition-colors duration-200 ${
                                        locale === language.code
                                            ? 'bg-purple-500/30 text-purple-300'
                                            : 'text-white'
                                    }`}
                                    title={`${language.name} (${language.code})`}
                                >
                                    <span className='text-lg' title='Flag'>
                                        {language.flag}
                                    </span>
                                    <span className='text-sm font-medium' title='Language Name'>
                                        {language.name}
                                    </span>
                                    {locale === language.code && (
                                        <svg
                                            className='w-4 h-4 ml-auto text-purple-400'
                                            fill='currentColor'
                                            viewBox='0 0 20 20'
                                        >
                                            <path
                                                fillRule='evenodd'
                                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                                clipRule='evenodd'
                                            />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
