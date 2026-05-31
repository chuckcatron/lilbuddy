import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lilbuddy/shared", "@lilbuddy/convex"],
};

export default nextConfig;
