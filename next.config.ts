import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Remotion packages contain native binaries (esbuild, FFmpeg bundler).
  // Mark them as external so Turbopack never tries to bundle them.
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/core",
    "@remotion/cli",
    "remotion",
  ],
};

export default nextConfig;
