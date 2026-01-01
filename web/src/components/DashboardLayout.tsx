'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            {children}

            <Footer />
        </div>
    );
}
