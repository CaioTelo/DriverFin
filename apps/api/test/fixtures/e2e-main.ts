import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { configureApplication } from '../../src/application.js';
import { PasswordMailer } from '../../src/auth/password-mailer.js';

class MailboxPasswordMailer extends PasswordMailer {
  async sendPasswordReset(email: string, token: string) {
    const path = process.env.E2E_MAILBOX_PATH;
    if (!path) throw new Error('E2E_MAILBOX_PATH é obrigatório no harness E2E.');
    await writeFile(path, JSON.stringify({ email, token }), { mode: 0o600 });
    return true;
  }
}

const { AppModule } = await import('../../src/app.module.js');
const testingModule = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PasswordMailer)
  .useClass(MailboxPasswordMailer)
  .compile();
const app = testingModule.createNestApplication();
configureApplication(app);
await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');

const close = async () => {
  await app.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
