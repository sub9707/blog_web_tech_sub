import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "velog.velcdn.com",
      },
      {
        protocol: "https",
        hostname: "miro.medium.com",
      },
      {
        protocol: "https",
        hostname: "media.calibraint.com",
      },
      {
        protocol: "https",
        hostname: "www.internetmatters.org",
      },
      {
        protocol: "https",
        hostname: "www.globalsign.com",
      },
      {
        protocol: "https",
        hostname: "pozafly.github.io",
      },
      {
        protocol: "https",
        hostname: "images.velog.io",
      },
    ],
  },
};

export default nextConfig;
