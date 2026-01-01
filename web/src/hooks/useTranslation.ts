'use client';

import { useCallback } from 'react';
import ru from '../locales/ru.json';
import en from '../locales/en.json';
import { useLanguage } from '@/lib/language-context';
import { Locale } from '@/lib/i18n-config';

const getByPath = (obj: Record<string, unknown>, path: string) => {
    return path
        .split('.')
        .reduce<unknown>(
            (acc, key) =>
                acc && typeof acc === 'object' && acc !== null && key in acc
                    ? (acc as Record<string, unknown>)[key]
                    : undefined,
            obj
        );
};

export function useTranslation() {
    const { locale, changeLanguage } = useLanguage();

    const messages =
        locale === 'ru' ? (ru as Record<string, unknown>) : (en as Record<string, unknown>);

    const t = useCallback(
        (key: string, fallback?: string, variables?: Record<string, unknown>) => {
            const value = getByPath(messages, key);
            let result = typeof value === 'string' ? value : fallback || key;

            if (variables) {
                Object.entries(variables).forEach(([varKey, varValue]) => {
                    const escapedKey = varKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    result = result.replace(new RegExp(`{{${escapedKey}}}`, 'g'), String(varValue));
                });
            }

            return result;
        },
        [messages]
    );

    const handleLanguageChange = useCallback(
        (newLocale: Locale) => {
            if (newLocale === locale) return;
            changeLanguage(newLocale);
        },
        [changeLanguage, locale]
    );

    return {
        t,
        locale,
        changeLanguage: handleLanguageChange,
        isRTL: false,
    };
}
