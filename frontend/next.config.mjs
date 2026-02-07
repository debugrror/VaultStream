/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/:path*', // Proxy to Backend
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'ginifin.com',
      },
      {
        protocol: 'https',
        hostname: 'vault-api.ginifin.com',
      }
    ],
  },
};

export default nextConfig;
