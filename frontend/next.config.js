/** @type {import('next').NextConfig} */

/**
 * Prefer a non-localhost API URL in Vercel/production builds.
 * Dashboard env sometimes still points at localhost from early deploys;
 * Cloudflare quick-tunnel is the public HTTPS front for the VPS MVP.
 */
function resolvePublicApiUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  const onVercel = Boolean(process.env.VERCEL);
  const isProd = process.env.NODE_ENV === 'production' || onVercel;
  const looksLocal =
    !fromEnv ||
    fromEnv.includes('localhost') ||
    fromEnv.includes('127.0.0.1');

  if (isProd && looksLocal) {
    return 'https://insertion-followed-agencies-rejected.trycloudflare.com/api';
  }

  return fromEnv || 'http://localhost:3001/api';
}

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: resolvePublicApiUrl(),
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET',
  },
  images: {
    domains: ['localhost', 'assets.coingecko.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/coins/images/**',
      },
    ],
  },
};

module.exports = nextConfig;
