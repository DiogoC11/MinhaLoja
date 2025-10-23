/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const nextConfig = {
  reactStrictMode: true,
  // Use separate build dirs for dev vs prod to avoid cache collisions
  distDir: isDev ? '.next-dev' : '.next',
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;

