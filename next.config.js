process.env.TZ = 'Asia/Ho_Chi_Minh';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Enable PWA in development for testing
  customWorkerDir: 'worker',
  buildExcludes: [/app-build-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      // Add your production domain(s) here
      // Example: 'yourdomain.com', 'cdn.yourdomain.com'
    ],
    // Enable image optimization for production
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // exceljs is better supported in Next.js, no need for special handling
    return config;
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  // Output configuration
  output: 'standalone', // For Docker deployment
  experimental: {
    // Prevent 3221226505 (buffer overrun / OOM) error on Windows
    workerThreads: false,
    cpus: 2
  }
}

module.exports = withPWA(nextConfig)

