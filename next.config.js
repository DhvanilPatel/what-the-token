const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Let Webpack handle async WASM, required by tiktoken
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    // Configure WASM loading for client components
    config.output = {
      ...config.output,
      webassemblyModuleFilename: "static/wasm/[modulehash].wasm",
      workerChunkLoading: "import-scripts",
    };

    // Important: Do not server-render the worker entry point itself
    // This might not be strictly necessary depending on how you import/use the worker,
    // but can prevent issues. Add specific worker entry if needed.
    // if (!isServer) {
    //   config.resolve.fallback = {
    //      ...config.resolve.fallback,
    //      // Add fallbacks if needed for worker environment
    //   };
    // }

    return config;
  },
  // Ensure all runtime modules are fully client-side
  reactStrictMode: true,
  experimental: {},

  headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              img-src 'self' data:;
              script-src 'self' 'unsafe-inline' 'unsafe-eval';
              style-src 'self' 'unsafe-inline';
              connect-src 'self';
              worker-src 'self' blob:;
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

// Wrap your config with the analyzer
module.exports = withBundleAnalyzer(nextConfig);
