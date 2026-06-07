import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Enable server actions (used by some form handlers)
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile pics
    ],
  },
};

export default nextConfig;
