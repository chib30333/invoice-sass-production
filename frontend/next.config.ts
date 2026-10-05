import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root has its own package-lock.json (for `npm run dev` there); keep Next scoped to frontend/.
  outputFileTracingRoot: __dirname,
  async rewrites() {
    // In dev the browser talks to /api/* and Next proxies it to FastAPI, so there is no CORS to configure.
    const api = process.env.API_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
