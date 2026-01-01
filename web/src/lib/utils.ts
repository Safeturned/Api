export const formatFileSize = (bytes: number, t: (key: string) => string): string => {
    if (bytes === 0) return `0 ${t('fileSizeUnits.bytes')}`;
    if (bytes < 0) return `0 ${t('fileSizeUnits.bytes')}`;
    const k = 1024;
    const sizeKeys = ['bytes', 'kb', 'mb', 'gb'];
    const i = Math.max(0, Math.min(sizeKeys.length - 1, Math.floor(Math.log(bytes) / Math.log(k))));
    return (
        parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + t(`fileSizeUnits.${sizeKeys[i]}`)
    );
};

export const formatScanTime = (milliseconds: number, t: (key: string) => string): string => {
    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)}${t('timeUnits.milliseconds')}`;
    } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(1)}${t('timeUnits.seconds')}`;
    } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}${t('timeUnits.minutes')} ${seconds}${t('timeUnits.seconds')}`;
    }
};

export const computeFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const bytes = Array.from(new Uint8Array(hashBuffer));
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64;
};

export const getRiskLevel = (score: number, t: (key: string) => string): string => {
    if (score >= 70) return t('results.unsafe');
    if (score >= 50) return t('results.suspicious');
    return t('results.safe');
};

export const getRiskColor = (score: number): string => {
    if (score >= 70) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-green-400';
};

export const encodeHashForUrl = (base64Hash: string): string => {
    return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodeHashFromUrl = (urlSafeHash: string): string => {
    let base64 = urlSafeHash.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padding);
    return base64;
};

export const throttle = <T extends (...args: unknown[]) => void>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (timeSinceLastCall >= delay) {
            lastCall = now;
            func(...args);
        } else {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func(...args);
                timeoutId = null;
            }, delay - timeSinceLastCall);
        }
    };
};
