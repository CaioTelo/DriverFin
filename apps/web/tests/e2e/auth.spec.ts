import { expect, test } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

test('cadastro, login, perfil, reload, logout e histórico', async ({ page }) => {
  const email = `e2e-${unique()}@example.com`;
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Motorista E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha e2e segura');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha e2e segura');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/dashboard/);
  await expect(page.getByLabel('E-mail')).toBeVisible();
});

test('credencial inválida e contas permanecem independentes', async ({ page, request }) => {
  const first = `a-${unique()}@example.com`;
  const second = `b-${unique()}@example.com`;
  for (const email of [first, second]) {
    await request.post('http://127.0.0.1:3001/api/auth/register', {
      headers: { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' },
      data: {
        name: email === first ? 'Conta A' : 'Conta B',
        email,
        password: 'senha independente',
      },
    });
  }
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(first);
  await page.getByLabel('Senha').fill('senha incorreta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('E-mail ou senha inválidos');
  await page.getByLabel('Senha').fill('senha independente');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('revalidação antiga não sobrescreve login concluído', async ({ page, request }) => {
  const email = `race-${unique()}@example.com`;
  await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers: { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' },
    data: { name: 'Login Concorrente', email, password: 'senha concorrente' },
  });

  let releaseRefresh!: () => void;
  const refreshReleased = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  let markRefreshStarted!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    markRefreshStarted = resolve;
  });
  let refreshCount = 0;
  await page.route('**/api/auth/refresh', async (route) => {
    refreshCount += 1;
    if (refreshCount > 1) return route.continue();
    markRefreshStarted();
    await refreshReleased;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INVALID_SESSION',
          message: 'Sua sessão não é válida.',
          writeOutcome: 'not_applied',
        },
      }),
    });
  });

  await page.goto('/login');
  await refreshStarted;
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha concorrente');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  releaseRefresh();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(/\/dashboard/);
});

test('falha transitória de revalidação preserva a sessão e permite tentar novamente', async ({
  page,
  request,
}) => {
  const email = `transient-${unique()}@example.com`;
  await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers: { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' },
    data: { name: 'Sessão Transitória', email, password: 'senha transitória' },
  });
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha transitória');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.route('**/api/auth/refresh', (route) => route.abort('connectionfailed'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByRole('heading', { name: 'Não foi possível verificar sua sessão' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.unroute('**/api/auth/refresh');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});

for (const width of [360, 390, 768, 1366]) {
  test(`telas de acesso sem rolagem horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/login', '/cadastro']) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await expect(page.getByLabel('E-mail')).toBeVisible();
    }
  });
}
