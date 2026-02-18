import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Production OAuth: use /oauth/callback so QF_OAUTH_REDIRECT_URI can be https://your-domain.com/oauth/callback
      { source: "/oauth/callback", destination: "/api/auth/callback" },
    ];
  },
};

export default nextConfig;
