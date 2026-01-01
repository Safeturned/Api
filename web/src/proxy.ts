import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    DEFAULT_LOCALE,
    Locale,
    normalizeLocale,
    pickLocaleFromAcceptLanguage,
} from './lib/i18n-config';

const shouldBypass = (pathname: string) =>
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[\w]+$/.test(pathname);

const getLocaleFromRequest = (request: NextRequest): Locale => {
    const cookieLocale = normalizeLocale(request.cookies.get('NEXT_LOCALE')?.value);
    if (cookieLocale) return cookieLocale;

    const headerLocale = pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));
    if (headerLocale) return headerLocale;

    return DEFAULT_LOCALE;
};

const buildCookieOptions = (request: NextRequest) => ({
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'strict' as const,
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: false,
    path: '/',
});

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (shouldBypass(pathname)) {
        return NextResponse.next();
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const localeInPath = normalizeLocale(pathSegments[0]);

    if (localeInPath) {
        const response = NextResponse.next();
        const existingCookie = normalizeLocale(request.cookies.get('NEXT_LOCALE')?.value);

        if (existingCookie !== localeInPath) {
            response.cookies.set('NEXT_LOCALE', localeInPath, buildCookieOptions(request));
        }

        return response;
    }

    const locale = getLocaleFromRequest(request);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

    const response = NextResponse.rewrite(rewriteUrl);
    response.cookies.set('NEXT_LOCALE', locale, buildCookieOptions(request));
    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/|.*\\..*).*)'],
};
