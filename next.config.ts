import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Pin the root so a stray lockfile in a parent folder is not picked up.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
