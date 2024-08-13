/** @type {import('next').NextConfig} */
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };

    if (typeof window === 'undefined') {
      // server
      return config;
    }

    // client
    config.plugins.push(
      new MonacoWebpackPlugin({
        languages: ['javascript', 'html', 'css'],
        filename: 'static/[name].worker.js',
      })
    );

    return config;
  },
};

module.exports = nextConfig;