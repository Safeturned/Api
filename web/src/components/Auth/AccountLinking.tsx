'use client';

import { useEffect, useState } from 'react';
import { useAuth, LinkedIdentity } from '@/lib/auth-context';
import { DiscordIcon, SteamIcon } from '@/components/Icons';
import { getApiUrl } from '@/lib/api-client';

export default function AccountLinking() {
    const { getLinkedIdentities, unlinkIdentity, isAuthenticated } = useAuth();
    const [linkedIdentities, setLinkedIdentities] = useState<LinkedIdentity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

    useEffect(() => {
        const fetchIdentities = async () => {
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const identities = await getLinkedIdentities();
                setLinkedIdentities(identities || []);
                setError(null);
            } catch (err) {
                setError('Failed to load linked identities');
                console.error('Error fetching identities:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchIdentities();
    }, [isAuthenticated, getLinkedIdentities]);

    const handleUnlinkClick = async (providerName: string) => {
        if (linkedIdentities.length <= 1) {
            setError('Cannot unlink the only authentication method');
            return;
        }

        if (
            !confirm(
                `Are you sure you want to unlink ${providerName}? You'll no longer be able to log in with ${providerName}.`
            )
        ) {
            return;
        }

        try {
            setUnlinkingProvider(providerName);
            setError(null);
            const success = await unlinkIdentity(providerName);

            if (success) {
                const identities = await getLinkedIdentities();
                setLinkedIdentities(identities || []);
            } else {
                setError(`Failed to unlink ${providerName}`);
            }
        } catch (err) {
            setError(`Failed to unlink ${providerName}`);
            console.error('Error unlinking identity:', err);
        } finally {
            setUnlinkingProvider(null);
        }
    };

    const handleLinkProvider = (provider: string) => {
        const callbackUrl = `${window.location.origin}/auth/callback`;
        sessionStorage.setItem('auth_return_url', window.location.pathname);

        if (provider === 'discord') {
            window.location.href = `${getApiUrl('auth/discord')}?returnUrl=${encodeURIComponent(callbackUrl)}`;
        } else if (provider === 'steam') {
            window.location.href = `${getApiUrl('auth/steam')}?returnUrl=${encodeURIComponent(callbackUrl)}`;
        }
    };

    const isDiscordLinked = linkedIdentities.some(id => id.providerName === 'Discord');
    const isSteamLinked = linkedIdentities.some(id => id.providerName === 'Steam');

    return (
        <div className='w-full space-y-6'>
            <div>
                <h2 className='text-2xl font-bold text-white mb-2'>Connected Accounts</h2>
                <p className='text-slate-400 text-sm'>
                    Manage the accounts you use to log in to Safeturned
                </p>
            </div>

            {error && (
                <div className='bg-red-500/10 border border-red-500/50 rounded-lg p-4'>
                    <p className='text-red-400 text-sm'>{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500'></div>
                </div>
            ) : (
                <div className='space-y-4'>
                    <div className='bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <div className='p-3 bg-[#5865F2]/20 rounded-lg'>
                                    <DiscordIcon />
                                </div>
                                <div>
                                    <h3 className='font-semibold text-white'>Discord</h3>
                                    {isDiscordLinked ? (
                                        <div className='text-sm text-slate-400'>
                                            {linkedIdentities.find(
                                                id => id.providerName === 'Discord'
                                            )?.providerUsername && (
                                                <p>
                                                    Connected as{' '}
                                                    <span className='text-slate-300'>
                                                        {
                                                            linkedIdentities.find(
                                                                id => id.providerName === 'Discord'
                                                            )?.providerUsername
                                                        }
                                                    </span>
                                                </p>
                                            )}
                                            {linkedIdentities.find(
                                                id => id.providerName === 'Discord'
                                            )?.lastAuthenticatedAt && (
                                                <p className='text-xs text-slate-500 mt-1'>
                                                    Last authenticated:{' '}
                                                    {new Date(
                                                        linkedIdentities.find(
                                                            id => id.providerName === 'Discord'
                                                        )?.lastAuthenticatedAt || ''
                                                    ).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className='text-sm text-slate-500'>Not connected</p>
                                    )}
                                </div>
                            </div>
                            {isDiscordLinked ? (
                                <button
                                    onClick={() => handleUnlinkClick('Discord')}
                                    disabled={
                                        linkedIdentities.length <= 1 ||
                                        unlinkingProvider === 'Discord'
                                    }
                                    className='px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-lg transition-colors font-medium'
                                >
                                    {unlinkingProvider === 'Discord' ? 'Unlinking...' : 'Unlink'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleLinkProvider('discord')}
                                    className='px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors font-medium'
                                >
                                    Link
                                </button>
                            )}
                        </div>
                    </div>

                    <div className='bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <div className='p-3 bg-slate-700/50 rounded-lg'>
                                    <SteamIcon />
                                </div>
                                <div>
                                    <h3 className='font-semibold text-white'>Steam</h3>
                                    {isSteamLinked ? (
                                        <div className='text-sm text-slate-400'>
                                            {linkedIdentities.find(
                                                id => id.providerName === 'Steam'
                                            )?.providerUsername && (
                                                <p>
                                                    Connected as{' '}
                                                    <span className='text-slate-300'>
                                                        {
                                                            linkedIdentities.find(
                                                                id => id.providerName === 'Steam'
                                                            )?.providerUsername
                                                        }
                                                    </span>
                                                </p>
                                            )}
                                            {linkedIdentities.find(
                                                id => id.providerName === 'Steam'
                                            )?.lastAuthenticatedAt && (
                                                <p className='text-xs text-slate-500 mt-1'>
                                                    Last authenticated:{' '}
                                                    {new Date(
                                                        linkedIdentities.find(
                                                            id => id.providerName === 'Steam'
                                                        )?.lastAuthenticatedAt || ''
                                                    ).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className='text-sm text-slate-500'>Not connected</p>
                                    )}
                                </div>
                            </div>
                            {isSteamLinked ? (
                                <button
                                    onClick={() => handleUnlinkClick('Steam')}
                                    disabled={
                                        linkedIdentities.length <= 1 ||
                                        unlinkingProvider === 'Steam'
                                    }
                                    className='px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-lg transition-colors font-medium'
                                >
                                    {unlinkingProvider === 'Steam' ? 'Unlinking...' : 'Unlink'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleLinkProvider('steam')}
                                    className='px-4 py-2 bg-gradient-to-r from-[#1b2838] to-[#2a475e] hover:from-[#171f2b] hover:to-[#1e3447] text-white rounded-lg transition-colors font-medium'
                                >
                                    Link
                                </button>
                            )}
                        </div>
                    </div>

                    {linkedIdentities.length === 1 && (
                        <div className='bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mt-4'>
                            <p className='text-blue-400 text-sm'>
                                ℹ️ You can link additional accounts for easier access. You must
                                always have at least one authentication method.
                            </p>
                        </div>
                    )}

                    <div className='bg-slate-800/30 rounded-lg p-4 mt-6'>
                        <h4 className='font-semibold text-slate-300 mb-2'>Why link accounts?</h4>
                        <ul className='text-sm text-slate-400 space-y-1'>
                            <li>✓ Log in with your preferred account</li>
                            <li>✓ Access the same account from multiple platforms</li>
                            <li>✓ Easy account recovery if you lose access to one provider</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
