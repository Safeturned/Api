import { Metadata } from 'next';
import LoginForm from '@/components/Auth/LoginForm';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Login - Safeturned',
    description: 'Login to your Safeturned account',
};

export default function LoginPage() {
    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800'>
            <Navigation />
            <div className='flex-1 flex items-center justify-center px-4 py-12'>
                <LoginForm />
            </div>
            <Footer />
        </div>
    );
}
