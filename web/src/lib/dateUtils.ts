export function formatDateTime(dateString: string | Date, locale: string = 'en-US'): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function formatDate(dateString: string | Date, locale: string = 'en-US'): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatTime(dateString: string | Date, locale: string = 'en-US'): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function formatRelativeTime(dateString: string | Date, locale: string = 'en-US'): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    return formatDateTime(date, locale);
}
