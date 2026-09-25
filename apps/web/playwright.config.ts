import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { config as loadEnvironment } from 'dotenv';

const repositoryRoot = resolve(process.cwd(), '../..');
loadEnvironment({ path: resolve(repositoryRoot, 'apps/api/.env'), quiet: true });
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL é obrigatória para o E2E.');
const mailboxPath = resolve(repositoryRoot, 'apps/api/.e2e-mailbox.json');

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '/tmp/driverfin-playwright-results',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start:e2e --workspace apps/api',
      cwd: repositoryRoot,
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        PORT: '3001',
        WEB_ORIGIN: 'http://localhost:3000',
        JWT_ACCESS_SECRET: 'playwright-secret-with-at-least-32-bytes',
        JWT_ISSUER: 'driverfin-api',
        JWT_AUDIENCE: 'driverfin-web',
        E2E_MAILBOX_PATH: mailboxPath,
      },
    },
    {
      command: 'npm run dev --workspace apps/web',
      cwd: repositoryRoot,
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: { API_ORIGIN: 'http://127.0.0.1:3001', NEXT_TELEMETRY_DISABLED: '1' },
    },
  ],
});
