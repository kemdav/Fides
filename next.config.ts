import type { NextConfig } from "next";

const isLocalSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost");

const allowLocalImages =
  process.env.NODE_ENV === "development" || Boolean(isLocalSupabase);

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Never advertise the framework version.
  poweredByHeader: false,

  // `nodemailer` relies on Node built-ins and must not be bundled by the
  // server compiler (it is only ever imported from server-side modules).
  serverExternalPackages: ["nodemailer"],

  // Pin the Turbopack workspace root to this project so a lockfile in a parent
  // directory is not mistaken for the repo root.
  turbopack: {
    root: process.cwd(),
  },

  images: {
    // Bypass /_next/image private-IP blocking for local Supabase Storage (127.0.0.1:54321).
    // Production deployments using *.supabase.co remain fully optimized.
    unoptimized: allowLocalImages,
    // Tenant branding and service imagery are served from Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(allowLocalImages
        ? [
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "54321",
              pathname: "/storage/v1/object/public/**",
            },
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "54321",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;