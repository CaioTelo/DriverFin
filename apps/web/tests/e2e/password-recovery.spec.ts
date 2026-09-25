import { expect, test } from '@playwright/test';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const mailbox = resolve(process.cwd(), '../api/.e2e-mailbox.json');
const headers = { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' };

async function readToken() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      return JSON.parse(await readFile(mailbox, 'utf8')) as { email: string; token: string };
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw new Error('Provider fake não recebeu o e-mail.');
}

test('recupera senha, invalida uso repetido, senha antiga e sessão anterior', async ({
  page,
  request,
}) => {
  await rm(mailbox, { force: true });
  const email = `recovery-${Date.now()}@example.com`;
  await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers,
    data: { name: 'Recuperação E2E', email, password: 'senha anterior e2e' },
  });
  const oldLogin = await request.post('http://127.0.0.1:3001/api/auth/login', {
    headers,
    data: { email, password: 'senha anterior e2e' },
  });
  const oldAccess = (await oldLogin.json()).accessToken as string;

  await page.goto('/recuperar-senha');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByRole('status')).toContainText('Se houver uma conta');
  const { token } = await readToken();

  await page.goto(`/redefinir-senha#token=${token}`);
  await expect(page).not.toHaveURL(/token=/);
  await page.getByLabel('Nova senha').fill('curta');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/redefinir-senha/);
  await page.getByLabel('Nova senha').fill('senha posterior e2e');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/login/);

  expect(
    (
      await request.get('http://127.0.0.1:3001/api/users/me', {
        headers: { Authorization: `Bearer ${oldAccess}` },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post('http://127.0.0.1:3001/api/auth/login', {
        headers,
        data: { email, password: 'senha anterior e2e' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post('http://127.0.0.1:3001/api/auth/login', {
        headers,
        data: { email, password: 'senha posterior e2e' },
      })
    ).status(),
  ).toBe(200);

  await page.goto(`/redefinir-senha#token=${token}`);
  await page.getByLabel('Nova senha').fill('outra senha válida');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('inválido ou expirou');
});

for (const width of [360, 390, 768, 1366]) {
  test(`recuperação sem corte horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/recuperar-senha');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.goto('/redefinir-senha');
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
