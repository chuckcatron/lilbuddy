import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lilbuddy/shared", "@lilbuddy/convex"],
  webpack: (config) => {
    // Resolve .ts files when workspace packages use .js extensions (NodeNext convention)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
