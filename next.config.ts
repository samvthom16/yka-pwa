import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ykasandbox.com" },
      { protocol: "https", hostname: "**.gravatar.com" },
    ],
  },
};

export default nextConfig;
