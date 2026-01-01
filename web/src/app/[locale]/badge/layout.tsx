import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReactNode } from 'react';

export default function BadgeLayout({ children }: { children: ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
