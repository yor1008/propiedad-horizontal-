const API_URL = process.env.API_URL || 'http://localhost:8080'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // El navegador llama a /api/* y Next lo reenvía al backend (sin CORS).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]
  },
}

export default nextConfig
