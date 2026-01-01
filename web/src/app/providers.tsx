'use client';

import { AuthProvider } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';
import { DEFAULT_LOCALE } from '@/lib/i18n-config';

export function Providers({ children }: { children: React.ReactNode }) {
    const initialLocale = DEFAULT_LOCALE;

    return (
        <LanguageProvider initialLocale={initialLocale}>
            <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
    );
}
