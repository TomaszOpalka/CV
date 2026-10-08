import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static HTML for every route -> deployed as plain files on Netlify (publish dir: out/).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
