const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Suporte a subdiretório no GitHub Pages (ex: /nome-do-repo) caso configurado via env
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Garantir que o Next use a raiz correta deste projeto
  outputFileTracingRoot: path.join(__dirname),
  // Otimizações para mobile e exportação estática
  images: {
    unoptimized: true,
    domains: ['assets.mixkit.co'],
  },
}

module.exports = nextConfig