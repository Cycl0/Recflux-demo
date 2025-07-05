/** @type {import('next').NextConfig} */
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };

      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['javascript', 'html', 'css'],
          filename: 'static/[name].worker.js',
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;