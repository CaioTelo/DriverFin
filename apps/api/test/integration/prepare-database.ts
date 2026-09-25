import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { requireTestDatabaseUrl } from './test-database.js';

const databaseUrl = requireTestDatabaseUrl();
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDirectory, '../../..');
const prismaCli = resolve(apiRoot, '../../node_modules/prisma/build/index.js');

const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: apiRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
