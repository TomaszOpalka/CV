import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static HTML for every route -> deployed as plain files on Netlify (publish dir: out/).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Pin the project root. Without it Next looks for lockfiles above the repository (e.g. a stray package-lock.json in the
  // user's home folder) and warns about "multiple lockfiles" / an ignored one.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
