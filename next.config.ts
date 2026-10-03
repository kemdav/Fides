import type { NextConfig } from "next";

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
    // Tenant branding and service imagery are served from Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
