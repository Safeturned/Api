const nextConfig = {
    output: 'standalone',

    // Turbopack configuration (Next.js 16 default bundler)
    turbopack: {},

    generateBuildId: async () => {
        return `build-${Date.now()}`;
    },

    trailingSlash: false,

    env: {
        BUILD_TIME: Date.now().toString(),
    },

    images: {
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60,
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    async headers() {
        return [
            {
                source: '/favicon.ico',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
