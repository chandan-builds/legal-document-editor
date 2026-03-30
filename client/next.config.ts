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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://legal-office.azinotech.com",
              "frame-src 'self' https://legal-office.azinotech.com",
              "connect-src 'self' http://localhost:3001 https://legal-office.azinotech.com ws://localhost:3001 https://legal-document-editor-cdi9.onrender.com wss://legal-document-editor-cdi9.onrender.com",
              "style-src 'self' 'unsafe-inline' https://legal-office.azinotech.com",
              "img-src 'self' data: blob: https://legal-office.azinotech.com",
              "font-src 'self' data: https://legal-office.azinotech.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
