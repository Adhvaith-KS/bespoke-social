import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cap build parallelism — the default (one worker per core) can OOM the
  // build box during "Collecting page data".
  experimental: {
    cpus: 4,
  },
};

export default nextConfig;
