'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    DEFAULT_LOCALE,
    Locale,
    SUPPORTED_LOCALES,
    normalizeLocale,
    pickLocaleFromAcceptLanguage,
} from './i18n-config';

type LanguageContextValue = {
    locale: Locale;
    changeLanguage: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const readLocaleFromCookie = (): Locale | null => {
    if (typeof document === 'undefined') return null;

    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    return match ? normalizeLocale(decodeURIComponent(match[1])) : null;
};

const readLocaleFromPath = (pathname: string | null): Locale | null => {
    if (!pathname) return null;

    const [firstSegment] = pathname.split('/').filter(Boolean);
    return normalizeLocale(firstSegment);
};

const detectBrowserLocale = (pathname: string | null): Locale => {
    const cookieLocale = readLocaleFromCookie();
    if (cookieLocale) return cookieLocale;

    const pathLocale = readLocaleFromPath(pathname);
    if (pathLocale) return pathLocale;

    const navigatorLocale =
        typeof navigator !== 'undefined'
            ? normalizeLocale(navigator.language?.split('-')?.[0])
            : null;
    if (navigatorLocale) return navigatorLocale;

    const headerLocale =
        typeof navigator === 'undefined' ? pickLocaleFromAcceptLanguage(null) : null;
    if (headerLocale) return headerLocale;

    return DEFAULT_LOCALE;
};

export function LanguageProvider({
    children,
    initialLocale,
}: {
    children: React.ReactNode;
    initialLocale?: Locale;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [locale, setLocale] = useState<Locale>(
        () => initialLocale ?? detectBrowserLocale(pathname)
    );

    useEffect(() => {
        const detected = detectBrowserLocale(pathname);
        if (detected !== locale) {
            setLocale(detected);
        }
    }, [locale, pathname]);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const changeLanguage = useCallback(
        (newLocale: Locale) => {
            if (!SUPPORTED_LOCALES.includes(newLocale)) return;
            setLocale(current => (current === newLocale ? current : newLocale));

            const secureFlag =
                typeof window !== 'undefined' && window.location.protocol === 'https:'
                    ? '; Secure'
                    : '';
            if (typeof document !== 'undefined') {
                document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Strict${secureFlag}`;
            }

            router.refresh();
        },
        [router]
    );

    const value = useMemo(
        () => ({
            locale,
            changeLanguage,
        }),
        [changeLanguage, locale]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
