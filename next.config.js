/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true,
  },
  webpack: (config) => {
    // Supabase's realtime client includes a dynamic require that triggers a noisy (but harmless) warning in Next/Webpack.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@supabase\/realtime-js/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
