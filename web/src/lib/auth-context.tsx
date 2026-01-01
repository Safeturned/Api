'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, getApiUrl } from './api-client';
import { AUTH_STORAGE_KEYS, AUTH_EVENTS } from './auth-constants';

function validateReturnUrl(url: string): string {
    const defaultUrl = '/en/dashboard';

    if (!url) {
        return defaultUrl;
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        if (!decodedUrl.startsWith('/')) {
            return defaultUrl;
        }

        if (decodedUrl.match(/^\/[/\\]/)) {
            return defaultUrl;
        }

        if (decodedUrl.toLowerCase().startsWith('/login')) {
            return defaultUrl;
        }

        if (decodedUrl.includes(':') || decodedUrl.includes('//') || decodedUrl.includes('\\\\')) {
            return defaultUrl;
        }

        return decodedUrl;
    } catch {
        return defaultUrl;
    }
}

export interface LinkedIdentity {
    providerName: string;
    providerId: number;
    providerUserId: string;
    providerUsername?: string;
    connectedAt: string;
    lastAuthenticatedAt?: string;
}

export interface User {
    id: string;
    email?: string;
    username?: string;
    avatarUrl?: string;
    tier: number;
    isAdmin: boolean;
    linkedIdentities?: LinkedIdentity[];
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (returnUrl?: string) => void;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
    getLinkedIdentities: () => Promise<LinkedIdentity[] | null>;
    unlinkIdentity: (providerName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadAndValidateAuth = async () => {
            // Check if we have stored auth data
            const storedUserStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER);

            if (!storedUserStr) {
                setIsLoading(false);
                return;
            }

            // Restore user from localStorage immediately (optimistic load)
            try {
                const storedUser = JSON.parse(storedUserStr) as User;
                setUser(storedUser);
            } catch {
                setIsLoading(false);
                return;
            }

            // Validate the stored session with the server in background
            try {
                const currentUser = await api.get<User>('auth/me');
                setUser(currentUser); // Update with fresh server data
            } catch (error) {
                console.warn('Session validation failed, using cached user:', error);
                // Keep the user logged in with cached data
                // They will be logged out when they try to make an authenticated request
            } finally {
                setIsLoading(false);
            }
        };

        loadAndValidateAuth();
    }, []);

    useEffect(() => {
        if (user) {
            localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
        }
    }, [user]);

    useEffect(() => {
        const handleSessionInvalid = () => {
            console.warn('Session invalid event received, clearing user');
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener(AUTH_EVENTS.SESSION_INVALID, handleSessionInvalid);
            return () => {
                window.removeEventListener(AUTH_EVENTS.SESSION_INVALID, handleSessionInvalid);
            };
        }
    }, []);

    const login = useCallback((returnUrl?: string) => {
        const rawReturnUrl = returnUrl || window.location.pathname;
        const validatedReturnUrl = validateReturnUrl(rawReturnUrl);

        sessionStorage.setItem('auth_return_url', validatedReturnUrl);

        window.location.href = `${getApiUrl('auth/discord')}?returnUrl=${encodeURIComponent(validatedReturnUrl)}`;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('auth/logout', { refreshToken: null });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
            router.push('/');
        }
    }, [router]);

    const refreshAuth = useCallback(async () => {
        try {
            const currentUser = await api.get<User>('auth/me');
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to refresh auth:', error);
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
        }
    }, []);

    const getLinkedIdentities = useCallback(async (): Promise<LinkedIdentity[] | null> => {
        try {
            return await api.get<LinkedIdentity[]>('auth/linked-identities');
        } catch (error) {
            console.error('Failed to get linked identities:', error);
            return null;
        }
    }, []);

    const unlinkIdentity = useCallback(
        async (providerName: string): Promise<boolean> => {
            try {
                await api.post('auth/unlink', { providerName });

                if (user) {
                    const identities = await getLinkedIdentities();
                    setUser({
                        ...user,
                        linkedIdentities: identities || undefined,
                    });
                }

                return true;
            } catch (error) {
                console.error('Failed to unlink identity:', error);
                return false;
            }
        },
        [user, getLinkedIdentities]
    );

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
        getLinkedIdentities,
        unlinkIdentity,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function setAuthData(user: User) {
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
}
