import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  experimental: {
    useTypeScriptCli: false,
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    if (process.env.NEXT_PUBLIC_BASE_PATH) return [];
    return [
      { source: "/test/:path*", destination: "/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source:
          "/:section(admin|auth|api|dashboard|onboarding|profile|saved|my-courses|login|signup|verify-email|forgot-password|reset-password|suspended)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
