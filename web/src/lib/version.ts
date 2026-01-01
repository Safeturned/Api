export function getVersionString(): string {
    const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION || 'dev';
    return `v${version}`;
}
