import type { NextConfig } from 'next';

const configuredOrigin = process.env.API_ORIGIN;
if (!configuredOrigin) {
  throw new Error('API_ORIGIN é obrigatória.');
}

const apiOrigin = new URL(configuredOrigin);
if (
  !['http:', 'https:'].includes(apiOrigin.protocol) ||
  apiOrigin.username ||
  apiOrigin.password ||
  apiOrigin.pathname !== '/' ||
  apiOrigin.search ||
  apiOrigin.hash
) {
  throw new Error('API_ORIGIN deve ser uma origem HTTP(S), sem caminho ou credenciais.');
}

const config: NextConfig = {
  // A governança do projeto é mantida no AGENTS.md da raiz e no Spec Kit.
  agentRules: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin.origin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};

export default config;
