'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { api } from '@/lib/api-client';

const API_KEY_SCOPES = {
    READ: 'read',
    ANALYZE: 'analyze',
    RUNTIME_SCAN: 'runtime-scan',
} as const;

const WEBSITE_SERVICE_NAME = 'Website Service';

type ApiKeyScope = (typeof API_KEY_SCOPES)[keyof typeof API_KEY_SCOPES];

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    lastSixChars: string;
    maskedKey: string;
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    isActive: boolean;
    scopes: string[];
    ipWhitelist: string | null;
}

export default function ApiKeysPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyResult, setNewKeyResult] = useState<{ key: string; id: string } | null>(null);
    const [creating, setCreating] = useState(false);
    const [keyLimits, setKeyLimits] = useState<{
        current: number;
        max: number;
        canCreateMore: boolean;
    } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        show: boolean;
        keyId: string;
        keyName: string;
    }>({ show: false, keyId: '', keyName: '' });
    const [regenerateConfirm, setRegenerateConfirm] = useState<{
        show: boolean;
        keyId: string;
        keyName: string;
    }>({ show: false, keyId: '', keyName: '' });
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
        API_KEY_SCOPES.READ,
        API_KEY_SCOPES.ANALYZE,
    ]);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?returnUrl=/dashboard/api-keys');
        } else if (isAuthenticated) {
            fetchApiKeys();
            fetchKeyLimits();
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showCreateModal) {
                    setShowCreateModal(false);
                    setNewKeyName('');
                    setError(null);
                } else if (newKeyResult) {
                    setNewKeyResult(null);
                } else if (deleteConfirm.show) {
                    setDeleteConfirm({ show: false, keyId: '', keyName: '' });
                } else if (regenerateConfirm.show) {
                    setRegenerateConfirm({ show: false, keyId: '', keyName: '' });
                }
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showCreateModal, newKeyResult, deleteConfirm.show, regenerateConfirm.show]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const fetchApiKeys = async () => {
        try {
            setLoading(true);
            const data = await api.get<ApiKey[]>('users/me/api-keys');
            setApiKeys(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const fetchKeyLimits = async () => {
        try {
            const data = await api.get<{ current: number; max: number; canCreateMore: boolean }>(
                'users/me/api-keys/limits'
            );
            setKeyLimits(data);
        } catch (err) {
            console.error('Failed to fetch key limits:', err);
        }
    };

    const createApiKey = async () => {
        if (!newKeyName.trim()) {
            setError(t('apiKeys.errors.nameRequired'));
            return;
        }

        if (newKeyName.trim().toLowerCase() === WEBSITE_SERVICE_NAME.toLowerCase()) {
            setError(
                t(
                    'apiKeys.errors.reservedName',
                    `'${WEBSITE_SERVICE_NAME}' is reserved and managed by Safeturned`
                )
            );
            return;
        }

        try {
            setCreating(true);
            setError(null);
            const data = await api.post<{ key: string; id: string }>('users/me/api-keys', {
                name: newKeyName,
                prefix: 'sk_live',
                scopes: selectedScopes,
            });

            setNewKeyResult({ key: data.key, id: data.id });
            setNewKeyName('');
            setSelectedScopes([API_KEY_SCOPES.READ, API_KEY_SCOPES.ANALYZE]);
            setShowCreateModal(false);
            setError(null);
            await fetchApiKeys();
            await fetchKeyLimits();
        } catch (err: unknown) {
            if (err instanceof Error) {
                if (
                    err.message.includes('Failed to fetch') ||
                    err.message.includes('NetworkError')
                ) {
                    setError(t('apiKeys.errors.networkError'));
                } else {
                    setError(
                        err.message ||
                            (err as { data?: { message?: string; error?: string } })?.data
                                ?.message ||
                            (err as { data?: { message?: string; error?: string } })?.data?.error ||
                            t('apiKeys.errors.createFailed')
                    );
                }
            } else {
                setError(t('apiKeys.errors.unexpectedError'));
            }
        } finally {
            setCreating(false);
        }
    };

    const confirmDelete = (keyId: string, keyName: string) => {
        if (keyName === WEBSITE_SERVICE_NAME) {
            setError(
                t(
                    'apiKeys.errors.protectedKey',
                    'This managed key cannot be regenerated or revoked.'
                )
            );
            return;
        }
        setDeleteConfirm({ show: true, keyId, keyName });
    };

    const deleteApiKey = async () => {
        const keyId = deleteConfirm.keyId;
        setDeleteConfirm({ show: false, keyId: '', keyName: '' });

        try {
            await api.delete(`users/me/api-keys/${keyId}`);
            await fetchApiKeys();
            await fetchKeyLimits();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('apiKeys.errors.revokeFailed'));
        }
    };

    const confirmRegenerate = (keyId: string, keyName: string) => {
        if (keyName === WEBSITE_SERVICE_NAME) {
            setError(
                t(
                    'apiKeys.errors.protectedKey',
                    'This managed key cannot be regenerated or revoked.'
                )
            );
            return;
        }
        setRegenerateConfirm({ show: true, keyId, keyName });
    };

    const regenerateApiKey = async () => {
        const keyId = regenerateConfirm.keyId;
        setRegenerateConfirm({ show: false, keyId: '', keyName: '' });

        try {
            const data = await api.post<{ key: string; id: string }>(
                `users/me/api-keys/${keyId}/regenerate`
            );
            setNewKeyResult({ key: data.key, id: data.id });
            await fetchApiKeys();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('apiKeys.errors.regenerateFailed'));
        }
    };

    const copyToClipboard = (text: string, id: string = 'default') => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
            setCopiedKey(null);
            copyTimeoutRef.current = null;
        }, 2000);
    };

    if (isLoading || !isAuthenticated || !user) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
                <div className='text-center'>
                    <div className='inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4'></div>
                    <p className='text-slate-300 text-lg'>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
            <Navigation />

            <div className='max-w-7xl mx-auto px-6 py-12'>
                <div className='mb-8 flex items-center justify-between'>
                    <div>
                        <Link
                            href='/dashboard'
                            className='text-purple-400 hover:text-purple-300 mb-2 inline-block'
                        >
                            {t('apiKeys.page.backToDashboard')}
                        </Link>
                        <h1 className='text-4xl font-bold'>{t('apiKeys.page.title')}</h1>
                        <p className='text-slate-400 mt-2'>{t('apiKeys.page.subtitle')}</p>
                        {keyLimits && (
                            <div className='mt-3 flex items-center gap-2'>
                                <span className='text-sm text-slate-400'>
                                    {t('apiKeys.page.keysLabel')}{' '}
                                    <span className='font-semibold text-white'>
                                        {keyLimits.current}
                                    </span>{' '}
                                    / {keyLimits.max === 9999 ? '∞' : keyLimits.max}
                                </span>
                                {!keyLimits.canCreateMore && keyLimits.max !== 9999 && (
                                    <span className='text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded'>
                                        {t('apiKeys.page.limitReached')}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setShowCreateModal(true);
                            setError(null);
                        }}
                        disabled={keyLimits ? !keyLimits.canCreateMore : false}
                        className='bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600'
                        title={
                            keyLimits && !keyLimits.canCreateMore
                                ? t('apiKeys.page.limitReachedTooltip')
                                : ''
                        }
                    >
                        {t('apiKeys.page.createButton')}
                    </button>
                </div>

                {keyLimits && !keyLimits.canCreateMore && keyLimits.max !== 9999 && (
                    <div className='mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg flex items-start gap-3'>
                        <svg
                            className='w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                        <div className='flex-1'>
                            <p className='text-orange-300 font-medium mb-1'>
                                {t('apiKeys.limitWarning.title')}
                            </p>
                            <p className='text-orange-400 text-sm'>
                                You can create up to {keyLimits.max} API key
                                {keyLimits.max > 1 ? 's' : ''}.
                            </p>
                        </div>
                    </div>
                )}

                {error && !showCreateModal && (
                    <div className='mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-start gap-3'>
                        <svg
                            className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                        <div className='flex-1'>
                            <p className='text-red-300 font-medium mb-1'>
                                {t('apiKeys.error.title')}
                            </p>
                            <p className='text-red-400 text-sm'>{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className='text-red-400 hover:text-red-300 transition-colors'
                            aria-label='Close error'
                        >
                            <svg
                                className='w-5 h-5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
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
                )}

                {newKeyResult && (
                    <div
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                        onClick={e => {
                            if (e.target === e.currentTarget) {
                                setNewKeyResult(null);
                            }
                        }}
                    >
                        <div className='bg-slate-800 rounded-xl p-8 max-w-2xl w-full border border-slate-700'>
                            <h3 className='text-2xl font-bold mb-4 text-green-400'>
                                {t('apiKeys.keyCreated.title')}
                            </h3>
                            <p className='text-slate-300 mb-4'>{t('apiKeys.keyCreated.message')}</p>
                            <div className='bg-slate-900 rounded-lg p-4 mb-6 font-mono text-sm break-all'>
                                <div className='flex items-center justify-between'>
                                    <code className='text-green-400'>{newKeyResult.key}</code>
                                    <button
                                        onClick={() => copyToClipboard(newKeyResult.key, 'newkey')}
                                        className='ml-4 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors'
                                    >
                                        {copiedKey === 'newkey'
                                            ? t('docs.codeExamples.copied')
                                            : t('docs.codeExamples.copy')}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setNewKeyResult(null)}
                                className='w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors'
                            >
                                {t('apiKeys.keyCreated.savedBtn')}
                            </button>
                        </div>
                    </div>
                )}

                {deleteConfirm.show && (
                    <div
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                        onClick={e => {
                            if (e.target === e.currentTarget) {
                                setDeleteConfirm({ show: false, keyId: '', keyName: '' });
                            }
                        }}
                    >
                        <div className='bg-slate-800 rounded-xl p-8 max-w-md w-full border border-red-500/50'>
                            <div className='text-center mb-6'>
                                <div className='w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                                    <svg
                                        className='w-8 h-8 text-red-400'
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
                                <h3 className='text-2xl font-bold mb-2 text-white'>
                                    {t('apiKeys.deleteConfirm.title')}
                                </h3>
                                <p className='text-slate-300 mb-2'>
                                    {t('apiKeys.deleteConfirm.message')}{' '}
                                    <span className='font-semibold text-white'>
                                        {deleteConfirm.keyName}
                                    </span>
                                    ?
                                </p>
                                <p className='text-red-400 text-sm'>
                                    {t('apiKeys.deleteConfirm.warning')}
                                </p>
                            </div>
                            <div className='flex gap-3'>
                                <button
                                    onClick={() =>
                                        setDeleteConfirm({ show: false, keyId: '', keyName: '' })
                                    }
                                    className='flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors'
                                >
                                    {t('apiKeys.deleteConfirm.cancel')}
                                </button>
                                <button
                                    onClick={deleteApiKey}
                                    className='flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {t('apiKeys.deleteConfirm.revoke')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {regenerateConfirm.show && (
                    <div
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                        onClick={e => {
                            if (e.target === e.currentTarget) {
                                setRegenerateConfirm({
                                    show: false,
                                    keyId: '',
                                    keyName: '',
                                });
                            }
                        }}
                    >
                        <div className='bg-slate-800 rounded-xl p-8 max-w-md w-full border border-yellow-500/50'>
                            <div className='text-center mb-6'>
                                <div className='w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                                    <svg
                                        className='w-8 h-8 text-yellow-400'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                        />
                                    </svg>
                                </div>
                                <h3 className='text-2xl font-bold mb-2 text-white'>
                                    {t('apiKeys.regenerateConfirm.title')}
                                </h3>
                                <p className='text-slate-300 mb-2'>
                                    {t('apiKeys.regenerateConfirm.message')}{' '}
                                    <span className='font-semibold text-white'>
                                        {regenerateConfirm.keyName}
                                    </span>
                                    ?
                                </p>
                                <p className='text-yellow-400 text-sm'>
                                    {t('apiKeys.regenerateConfirm.warning')}
                                </p>
                            </div>
                            <div className='flex gap-3'>
                                <button
                                    onClick={() =>
                                        setRegenerateConfirm({
                                            show: false,
                                            keyId: '',
                                            keyName: '',
                                        })
                                    }
                                    className='flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors'
                                >
                                    {t('apiKeys.regenerateConfirm.cancel')}
                                </button>
                                <button
                                    onClick={regenerateApiKey}
                                    className='flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {t('apiKeys.regenerateConfirm.regenerate')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showCreateModal && (
                    <div
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                        onClick={e => {
                            if (e.target === e.currentTarget) {
                                setShowCreateModal(false);
                                setNewKeyName('');
                                setError(null);
                            }
                        }}
                    >
                        <div className='bg-slate-800 rounded-xl p-8 max-w-md w-full border border-slate-700'>
                            <h3 className='text-2xl font-bold mb-4'>
                                {t('apiKeys.createModal.title')}
                            </h3>
                            <div className='mb-6'>
                                <label className='block text-sm font-medium text-slate-300 mb-2'>
                                    {t('apiKeys.createModal.keyNameLabel')}
                                </label>
                                <p className='text-xs text-slate-400 mb-2'>
                                    {t('apiKeys.createModal.keyNameHelp')}
                                </p>
                                <input
                                    type='text'
                                    value={newKeyName}
                                    onChange={e => {
                                        setNewKeyName(e.target.value);
                                        setError(null);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !creating && newKeyName.trim()) {
                                            createApiKey();
                                        }
                                    }}
                                    placeholder={t('apiKeys.createModal.placeholder')}
                                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'
                                    autoFocus
                                />
                            </div>
                            <div className='mb-6'>
                                <label className='block text-sm font-medium text-slate-300 mb-2'>
                                    {t('apiKeys.createModal.scopesLabel')}
                                </label>
                                <p className='text-xs text-slate-400 mb-3'>
                                    {t('apiKeys.createModal.scopesHelp')}
                                </p>
                                <div className='space-y-2'>
                                    <label className='flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors'>
                                        <input
                                            type='checkbox'
                                            checked={selectedScopes.includes(API_KEY_SCOPES.READ)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedScopes([
                                                        ...selectedScopes,
                                                        API_KEY_SCOPES.READ,
                                                    ]);
                                                } else {
                                                    setSelectedScopes(
                                                        selectedScopes.filter(
                                                            s => s !== API_KEY_SCOPES.READ
                                                        )
                                                    );
                                                }
                                            }}
                                            className='mt-0.5 w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 focus:ring-2'
                                        />
                                        <div className='flex-1'>
                                            <div className='text-sm font-medium text-white'>
                                                {t('apiKeys.createModal.scopeRead')}
                                            </div>
                                            <div className='text-xs text-slate-400'>
                                                {t('apiKeys.createModal.scopeReadDesc')}
                                            </div>
                                        </div>
                                    </label>
                                    <label className='flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors'>
                                        <input
                                            type='checkbox'
                                            checked={selectedScopes.includes(
                                                API_KEY_SCOPES.ANALYZE
                                            )}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedScopes([
                                                        ...selectedScopes,
                                                        API_KEY_SCOPES.ANALYZE,
                                                    ]);
                                                } else {
                                                    setSelectedScopes(
                                                        selectedScopes.filter(
                                                            s => s !== API_KEY_SCOPES.ANALYZE
                                                        )
                                                    );
                                                }
                                            }}
                                            className='mt-0.5 w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 focus:ring-2'
                                        />
                                        <div className='flex-1'>
                                            <div className='text-sm font-medium text-white'>
                                                {t('apiKeys.createModal.scopeAnalyze')}
                                            </div>
                                            <div className='text-xs text-slate-400'>
                                                {t('apiKeys.createModal.scopeAnalyzeDesc')}
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            {error && (
                                <div className='mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg'>
                                    <p className='text-red-300 text-sm'>{error}</p>
                                </div>
                            )}
                            <div className='flex gap-3'>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewKeyName('');
                                        setSelectedScopes([
                                            API_KEY_SCOPES.READ,
                                            API_KEY_SCOPES.ANALYZE,
                                        ]);
                                        setError(null);
                                    }}
                                    className='flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                    disabled={creating}
                                >
                                    {t('apiKeys.createModal.cancel')}
                                </button>
                                <button
                                    onClick={createApiKey}
                                    className='flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                    disabled={creating}
                                >
                                    {creating
                                        ? t('apiKeys.createModal.creating')
                                        : t('apiKeys.createModal.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className='flex items-center justify-center py-12'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500'></div>
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center'>
                        <svg
                            className='w-16 h-16 text-slate-600 mx-auto mb-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                            />
                        </svg>
                        <h3 className='text-xl font-semibold mb-2'>
                            {t('apiKeys.emptyState.title')}
                        </h3>
                        <p className='text-slate-400 mb-6'>{t('apiKeys.emptyState.subtitle')}</p>
                        <button
                            onClick={() => {
                                setShowCreateModal(true);
                                setError(null);
                            }}
                            disabled={keyLimits ? !keyLimits.canCreateMore : false}
                            className='bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {t('apiKeys.emptyState.createButton')}
                        </button>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {apiKeys.map(key => {
                            const isManagedKey = key.name === WEBSITE_SERVICE_NAME;
                            return (
                                <div
                                    key={key.id}
                                    className='bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6'
                                >
                                    <div className='flex items-start justify-between'>
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-3 mb-2'>
                                                <h3 className='text-xl font-semibold'>
                                                    {key.name}
                                                </h3>
                                                {isManagedKey && (
                                                    <span className='text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded'>
                                                        {t(
                                                            'apiKeys.keyCard.managedBadge',
                                                            'Managed'
                                                        )}
                                                    </span>
                                                )}
                                                {!key.isActive && (
                                                    <span className='text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded'>
                                                        {t('apiKeys.keyCard.revoked')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='font-mono text-sm text-slate-400 mb-4'>
                                                {key.maskedKey}
                                            </div>
                                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                                                <div>
                                                    <p className='text-slate-500'>
                                                        {t('apiKeys.keyCard.created')}
                                                    </p>
                                                    <p className='text-slate-300'>
                                                        {new Date(
                                                            key.createdAt
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className='text-slate-500'>
                                                        {t('apiKeys.keyCard.lastUsed')}
                                                    </p>
                                                    <p className='text-slate-300'>
                                                        {key.lastUsedAt
                                                            ? new Date(
                                                                  key.lastUsedAt
                                                              ).toLocaleDateString()
                                                            : t('apiKeys.keyCard.never')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className='text-slate-500'>
                                                        {t('apiKeys.keyCard.scopes')}
                                                    </p>
                                                    <p className='text-slate-300'>
                                                        {key.scopes.join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {key.isActive && (
                                            <div className='flex gap-2 ml-4'>
                                                <button
                                                    onClick={() =>
                                                        confirmRegenerate(key.id, key.name)
                                                    }
                                                    className='text-blue-400 hover:text-blue-300 p-2 disabled:opacity-40 disabled:cursor-not-allowed'
                                                    title={
                                                        isManagedKey
                                                            ? t(
                                                                  'apiKeys.keyCard.managedTooltip',
                                                                  'Managed key cannot be regenerated'
                                                              )
                                                            : t('apiKeys.keyCard.regenerateTooltip')
                                                    }
                                                    disabled={isManagedKey}
                                                >
                                                    <svg
                                                        className='w-5 h-5'
                                                        fill='none'
                                                        stroke='currentColor'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <path
                                                            strokeLinecap='round'
                                                            strokeLinejoin='round'
                                                            strokeWidth={2}
                                                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                                        />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(key.id, key.name)}
                                                    className='text-red-400 hover:text-red-300 p-2 disabled:opacity-40 disabled:cursor-not-allowed'
                                                    title={
                                                        isManagedKey
                                                            ? t(
                                                                  'apiKeys.keyCard.managedTooltip',
                                                                  'Managed key cannot be revoked'
                                                              )
                                                            : t('apiKeys.keyCard.revokeTooltip')
                                                    }
                                                    disabled={isManagedKey}
                                                >
                                                    <svg
                                                        className='w-5 h-5'
                                                        fill='none'
                                                        stroke='currentColor'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <path
                                                            strokeLinecap='round'
                                                            strokeLinejoin='round'
                                                            strokeWidth={2}
                                                            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className='mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6'>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <h3 className='text-lg font-semibold mb-2 flex items-center gap-2'>
                                {t('nav.apiDocumentation', 'API Documentation')}
                            </h3>
                            <p className='text-slate-300 text-sm'>
                                {t(
                                    'apiKeys.docsIntro',
                                    'Read our API documentation to learn how to integrate Safeturned into your application and manage API keys programmatically.'
                                )}
                            </p>
                        </div>
                        <Link
                            href='/docs'
                            className='px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap'
                        >
                            {t('apiKeys.viewDocs', 'View Docs')}
                        </Link>
                    </div>
                </div>
            </div>

            <BackToTop />
            <Footer />
        </div>
    );
}
