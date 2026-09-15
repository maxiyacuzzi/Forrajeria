import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local Supabase (Docker) serves storage from a private IP; the real
    // deployment always uses a public *.supabase.co host, so this only
    // matters for local dev and carries no SSRF exposure in production.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
