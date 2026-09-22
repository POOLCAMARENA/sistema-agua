/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || '';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  trailingSlash: true,
}

module.exports = nextConfig