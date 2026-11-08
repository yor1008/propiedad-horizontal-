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
  // /api/* lo atiende app/api/[...path]/route.ts (proxy con respaldo entre servidores; ver API_URLS).
}

export default nextConfig
