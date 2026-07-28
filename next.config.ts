import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // Imported sessions carry the full GPS track in the create payload; a long
    // run can produce several thousand points, so lift the default 1 MB cap.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
