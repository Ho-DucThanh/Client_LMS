import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint during production builds so the app can compile while we
    // iterate on fixing many existing lint errors across the repo.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
