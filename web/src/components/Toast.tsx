'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-gradient-to-r from-green-600 to-green-500 border-green-400';
            case 'error':
                return 'bg-gradient-to-r from-red-600 to-red-500 border-red-400';
            case 'warning':
                return 'bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-400';
            case 'info':
                return 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                        />
                    </svg>
                );
            case 'info':
                return (
                    <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                    </svg>
                );
        }
    };

    return (
        <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideInUp max-w-md w-full mx-4`}
            role='alert'
            aria-live='polite'
        >
            <div
                className={`${getTypeStyles()} text-white px-4 py-3 rounded-lg shadow-2xl border backdrop-blur-sm flex items-start gap-3`}
            >
                <div className='flex-shrink-0 mt-0.5'>{getIcon()}</div>
                <p className='flex-1 text-sm font-medium leading-relaxed'>{message}</p>
                <button
                    onClick={onClose}
                    className='flex-shrink-0 ml-2 hover:bg-white/20 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50'
                    aria-label='Close notification'
                >
                    <svg
                        className='w-4 h-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M6 18L18 6M6 6l12 12'
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
