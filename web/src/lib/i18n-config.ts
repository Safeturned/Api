export const SUPPORTED_LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const isSupportedLocale = (value?: string | null): value is Locale =>
    !!value && SUPPORTED_LOCALES.includes(value as Locale);

export const normalizeLocale = (value?: string | null): Locale | null =>
    isSupportedLocale(value) ? value : null;

export const pickLocaleFromAcceptLanguage = (acceptLanguage?: string | null): Locale | null => {
    if (!acceptLanguage) return null;

    const locales = acceptLanguage
        .split(',')
        .map(part => part.split(';')[0]?.trim().toLowerCase())
        .filter(Boolean);

    const match = locales.find(locale =>
        SUPPORTED_LOCALES.some(
            supported => locale === supported || locale.startsWith(`${supported}-`)
        )
    );

    return match ? (SUPPORTED_LOCALES.find(locale => match.startsWith(locale)) as Locale) : null;
};
