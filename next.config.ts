import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-northeast1.run.app",
    "localhost",
    "127.0.0.1",
  ],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
