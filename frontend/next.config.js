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
  // En modo unificado, el frontend se sirve desde el mismo dominio
  // No necesitamos rewrites porque API y frontend están en el mismo puerto
  trailingSlash: true,
}

module.exports = nextConfig
