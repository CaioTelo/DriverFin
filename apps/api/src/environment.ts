export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const databaseUrl = environment.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL é obrigatória.');
  }
  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida.');
  }
  if (protocol !== 'postgresql:' && protocol !== 'postgres:') {
    throw new Error('DATABASE_URL deve usar PostgreSQL.');
  }
  const port = Number(environment.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
  }
  const nodeEnvironment = environment.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnvironment))) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }

  const webOrigin = requireString(environment, 'WEB_ORIGIN');
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(webOrigin);
  } catch {
    throw new Error('WEB_ORIGIN deve ser uma origem HTTP válida.');
  }
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== webOrigin) {
    throw new Error('WEB_ORIGIN deve conter somente uma origem HTTP válida.');
  }

  const jwtSecret = requireString(environment, 'JWT_ACCESS_SECRET');
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_ACCESS_SECRET deve possuir pelo menos 32 bytes.');
  }
  requireString(environment, 'JWT_ISSUER');
  requireString(environment, 'JWT_AUDIENCE');

  if (nodeEnvironment === 'production') {
    requireString(environment, 'RESEND_API_KEY');
    requireString(environment, 'RESEND_FROM');
  }

  return { ...environment, PORT: port, NODE_ENV: nodeEnvironment, WEB_ORIGIN: webOrigin };
}

function requireString(environment: Record<string, unknown>, key: string): string {
  const value = environment[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${key} é obrigatória.`);
  return value;
}
