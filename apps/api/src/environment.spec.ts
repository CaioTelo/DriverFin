import { describe, expect, it } from '@jest/globals';
import { validateEnvironment } from './environment.js';

describe('configuração operacional', () => {
  const databaseUrl = 'postgresql://fixture:fixture@localhost:5433/driverfin_test';
  const base = {
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    JWT_ISSUER: 'driverfin-api',
    JWT_AUDIENCE: 'driverfin-web',
  };

  it('aceita PostgreSQL e usa a porta local padrão', () => {
    expect(validateEnvironment(base).PORT).toBe(3001);
    expect(validateEnvironment({ ...base, PORT: '8080' }).PORT).toBe(8080);
  });

  it.each([undefined, '', 'fixture-secret', 'mysql://fixture-secret@localhost/db'])(
    'recusa conexão ausente/inválida sem expor o valor',
    (DATABASE_URL) => {
      expect(() => validateEnvironment({ ...base, DATABASE_URL })).toThrow(/DATABASE_URL/);
      try {
        validateEnvironment({ ...base, DATABASE_URL });
      } catch (error) {
        expect(String(error)).not.toContain('fixture-secret');
      }
    },
  );

  it.each(['', 'invalid', '0', '-1', '65536', '1.5'])('recusa porta inválida %s', (PORT) => {
    expect(() => validateEnvironment({ ...base, PORT })).toThrow(/PORT/);
  });

  it('recusa origem, segredo e configuração produtiva incompletos', () => {
    expect(() =>
      validateEnvironment({ ...base, WEB_ORIGIN: 'http://localhost:3000/path' }),
    ).toThrow(/WEB_ORIGIN/);
    expect(() => validateEnvironment({ ...base, JWT_ACCESS_SECRET: 'curto' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'production' })).toThrow(
      /RESEND_API_KEY/,
    );
    expect(
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        RESEND_API_KEY: 'fixture',
        RESEND_FROM: 'fixture@example.com',
      }).NODE_ENV,
    ).toBe('production');
  });
});
