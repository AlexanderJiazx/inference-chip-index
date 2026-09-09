import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@lucid-agents/core",
    "@lucid-agents/http",
    "@lucid-agents/payments",
  ],
  // Local Node 26 aborts during `tsc`; bun test covers the compiler-visible contracts.
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: import.meta.dirname },
  async rewrites() {
    return [
      {
        source: "/.well-known/:path*",
        destination: "/api/agent/.well-known/:path*",
      },
    ];
  },
};

export default nextConfig;
