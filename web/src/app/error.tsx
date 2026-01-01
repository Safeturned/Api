'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function ErrorPage({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useTranslation();

    return (
        <html lang='en'>
            <body>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center',
                        padding: '20px',
                    }}
                >
                    <h1 style={{ fontSize: '72px', margin: '0', fontWeight: 'bold' }}>
                        {t('errors.pageTitle')}
                    </h1>
                    <h2 style={{ fontSize: '24px', margin: '20px 0', fontWeight: 'normal' }}>
                        {t('errors.somethingWentWrong')}!
                    </h2>
                    <p style={{ color: '#666', maxWidth: '600px' }}>
                        {t('errors.unexpectedError')}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '5px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                        }}
                    >
                        {t('errors.tryAgain')}
                    </button>
                </div>
            </body>
        </html>
    );
}
