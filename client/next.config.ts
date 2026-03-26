import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false,

  // Allow OnlyOffice Document Server to be loaded in iframe and scripts
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:8080",
              "frame-src http://localhost:8080",
              "connect-src 'self' http://localhost:3001 http://localhost:8080 ws://localhost:3001",
              "style-src 'self' 'unsafe-inline' http://localhost:8080",
              "img-src 'self' data: blob: http://localhost:8080",
              "font-src 'self' data: http://localhost:8080",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
