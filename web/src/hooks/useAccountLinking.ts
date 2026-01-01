import { useCallback, useState } from 'react';
import { useAuth, LinkedIdentity } from '@/lib/auth-context';

export function useAccountLinking() {
    const { getLinkedIdentities, unlinkIdentity } = useAuth();
    const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIdentities = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await getLinkedIdentities();
            setIdentities(result || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch identities');
        } finally {
            setIsLoading(false);
        }
    }, [getLinkedIdentities]);

    const unlink = useCallback(
        async (providerName: string) => {
            if (identities.length <= 1) {
                setError('Cannot unlink the only authentication method');
                return false;
            }

            try {
                setError(null);
                const success = await unlinkIdentity(providerName);
                if (success) {
                    await fetchIdentities();
                }
                return success;
            } catch (err) {
                setError(err instanceof Error ? err.message : `Failed to unlink ${providerName}`);
                return false;
            }
        },
        [identities.length, unlinkIdentity, fetchIdentities]
    );

    const isProviderLinked = useCallback(
        (providerName: string) => {
            return identities.some(id => id.providerName === providerName);
        },
        [identities]
    );

    const getProviderIdentity = useCallback(
        (providerName: string) => {
            return identities.find(id => id.providerName === providerName);
        },
        [identities]
    );

    return {
        identities,
        isLoading,
        error,
        fetchIdentities,
        unlink,
        isProviderLinked,
        getProviderIdentity,
        canUnlink: identities.length > 1,
    };
}
