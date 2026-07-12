const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Garantir que o Next use a raiz correta deste projeto
  outputFileTracingRoot: path.join(__dirname),
  // Otimizações para mobile
  images: {
    domains: ['assets.mixkit.co'],
  },
  // Configurações PWA / headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig