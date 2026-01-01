import { ReactNode } from 'react';

interface LocaleLayoutProps {
    children: ReactNode;
    params: Promise<{
        locale: string;
    }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;

    return <div data-locale={locale}>{children}</div>;
}
