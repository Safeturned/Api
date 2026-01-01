'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/hooks/useTranslation';
import LoadingPage from '@/components/LoadingPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { t } = useTranslation();
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
            } else if (requireAdmin && !user?.isAdmin) {
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, requireAdmin, user, router, pathname]);

    if (isLoading) {
        return <LoadingPage text={t('common.loading')} />;
    }

    if (!isAuthenticated || (requireAdmin && !user?.isAdmin)) {
        return null;
    }

    return <>{children}</>;
}
