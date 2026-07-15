const path = require('path');

/** @type {import('next').NextConfig} */

// Política de Segurança de Conteúdo (Content Security Policy)
// Define quais recursos o navegador tem permissão de carregar.
// Isto protege contra XSS e injeção de conteúdo malicioso.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://icons.brapi.dev;
  connect-src 'self' https://brapi.dev https://www.alphavantage.co https://assets.mixkit.co;
  media-src 'self' https://assets.mixkit.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

// Headers de segurança aplicados a todas as rotas
const securityHeaders = [
  {
    // Impede clickjacking: o site não pode ser embutido em iframes de outros domínios
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Impede que o browser "adivinhe" o tipo de conteúdo (MIME sniffing)
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controla quais informações de origem são enviadas nas requisições
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Restringe acesso a APIs sensíveis do hardware (câmera, microfone, localização)
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    // Proteção XSS legada para navegadores mais antigos
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Política de Segurança de Conteúdo — bloqueia scripts/estilos não autorizados
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
];

const nextConfig = {
  output: 'export',
  // Suporte a subdiretório no GitHub Pages (ex: /nome-do-repo) caso configurado via env
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Garantir que o Next use a raiz correta deste projeto
  outputFileTracingRoot: path.join(__dirname),
  // Otimizações para mobile e exportação estática
  images: {
    unoptimized: true,
    domains: ['icons.brapi.dev', 'assets.mixkit.co'],
  },
  // Headers de segurança HTTP — ativos em modo de servidor (next start / Vercel / etc.)
  // Para GitHub Pages (estático), configure via CDN ou arquivo public/_headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = nextConfig