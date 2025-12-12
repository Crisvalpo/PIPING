import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence webpack/turbopack conflict
  turbopack: {},
};

// Only apply PWA in production builds
if (process.env.NODE_ENV === 'production') {
  const withPWA = require('@ducanh2912/next-pwa').default;
  module.exports = withPWA({
    dest: 'public',
    register: true,
  })(nextConfig);
} else {
  module.exports = nextConfig;
}
