import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/sync': ['./sync/**/*'],
    '/api/cron/sync': ['./sync/**/*'],
    '/instrumentation': ['./sync/**/*'],
  },
};

export default nextConfig;
