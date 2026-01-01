'use client';

import React, { Component, ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    translations?: {
        somethingWentWrong: string;
        unexpectedErrorRefresh: string;
        errorDetailsDevOnly: string;
        refreshPage: string;
    };
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundaryClass extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center p-6'>
                    <div className='max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-lg p-8 text-center'>
                        <div className='mb-6'>
                            <svg
                                className='w-16 h-16 mx-auto text-red-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                />
                            </svg>
                        </div>

                        <h2 className='text-2xl font-bold mb-2'>
                            {this.props.translations?.somethingWentWrong || 'Something went wrong'}
                        </h2>

                        <p className='text-slate-300 mb-6'>
                            {this.props.translations?.unexpectedErrorRefresh ||
                                'An unexpected error occurred. Please try refreshing the page.'}
                        </p>

                        {this.state.error && process.env.NODE_ENV === 'development' && (
                            <details className='text-left mb-6 bg-slate-900/50 rounded p-4'>
                                <summary className='cursor-pointer text-sm text-slate-400 mb-2'>
                                    {this.props.translations?.errorDetailsDevOnly ||
                                        'Error Details (Development Only)'}
                                </summary>
                                <pre className='text-xs text-red-300 overflow-auto'>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className='px-6 py-3 bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg font-medium'
                        >
                            {this.props.translations?.refreshPage || 'Refresh Page'}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export function ErrorBoundary(props: Omit<Props, 'translations'>) {
    const { t } = useTranslation();

    const translations = {
        somethingWentWrong: t('errors.somethingWentWrong'),
        unexpectedErrorRefresh: t('errors.unexpectedErrorRefresh'),
        errorDetailsDevOnly: t('errors.errorDetailsDevOnly'),
        refreshPage: t('errors.refreshPage'),
    };

    return <ErrorBoundaryClass {...props} translations={translations} />;
}
