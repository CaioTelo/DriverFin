import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const apiHeaders = { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' };

async function login(page: Page, request: APIRequestContext) {
  const email = `expense-${unique()}@example.com`;
  const registration = await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers: apiHeaders,
    data: { name: 'Despesas E2E', email, password: 'senha despesas e2e' },
  });
  expect(registration.ok(), await registration.text()).toBe(true);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha despesas e2e');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function fill(page: Page, amount = '120,30', description?: string) {
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Categoria').selectOption('OTHER');
  if (description !== undefined) await page.getByLabel(/Descrição/).fill(description);
}

test('CRUD completo sem descrição, edição, limpeza, cancelamento e persistência', async ({
  page,
  request,
}) => {
  await login(page, request);
  await page.goto('/despesas/nova');
  await fill(page);
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa salva com sucesso.')).toBeVisible();
  await page.getByRole('link', { name: 'Ver despesas' }).click();
  await expect(page.getByText('R$ 120,30')).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await expect(page.getByLabel('Valor')).toHaveValue('120,30');
  await page.getByLabel('Valor').fill('98,40');
  await page.getByLabel(/Descrição/).fill('Pedágio da viagem');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa atualizada com sucesso.')).toBeVisible();
  await page.getByLabel(/Descrição/).fill('');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByLabel(/Descrição/)).toHaveValue('');
  await page.getByRole('button', { name: 'Excluir despesa' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByLabel('Valor')).toHaveValue('98,40');
  await page.getByRole('button', { name: 'Excluir despesa' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page).toHaveURL(/\/despesas/);
  await expect(page.getByText('Nenhuma despesa cadastrada')).toBeVisible();
});

test('preserva formulário e não repete resultado incerto', async ({ page, request }) => {
  await login(page, request);
  let posts = 0;
  await page.route('**/api/expenses', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    posts += 1;
    await route.abort();
  });
  await page.goto('/despesas/nova');
  await fill(page, '10,25', 'Preservar este texto');
  await page.getByRole('button', { name: 'Salvar despesa' }).dblclick();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    'Não foi possível confirmar o resultado',
  );
  await expect(page.getByLabel('Valor')).toHaveValue('10,25');
  await expect(page.getByLabel(/Descrição/)).toHaveValue('Preservar este texto');
  expect(posts).toBe(1);
});

test('remove sucesso anterior quando nova edição falha', async ({ page, request }) => {
  await login(page, request);
  await page.goto('/despesas/nova');
  await fill(page, '30,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await page.getByRole('link', { name: 'Ver despesas' }).click();
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await page.getByLabel('Valor').fill('31,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa atualizada com sucesso.')).toBeVisible();

  await page.route('**/api/expenses/*', async (route) => {
    if (route.request().method() === 'PUT') await route.abort();
    else await route.continue();
  });
  await page.getByLabel('Valor').fill('32,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    'Não foi possível confirmar o resultado',
  );
  await expect(page.getByText('Despesa atualizada com sucesso.')).toHaveCount(0);
  await expect(page.getByLabel('Valor')).toHaveValue('32,00');
});

test('distingue falha de consulta, sessão inválida e recurso removido', async ({
  page,
  request,
}) => {
  await login(page, request);
  await page.route('**/api/expenses?page=*', (route) => route.abort());
  await page.goto('/despesas');
  await expect(page.locator('.error[role="alert"]')).toContainText(
    'Não foi possível consultar os dados',
  );
  await page.unroute('**/api/expenses?page=*');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhuma despesa cadastrada')).toBeVisible();
  await page.route('**/api/expenses', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Sua sessão não é válida.',
          writeOutcome: 'not_applied',
        },
      }),
    });
  });
  await page.goto('/despesas/nova');
  await fill(page, '20,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText('Sua sessão não é válida');
  await page.unroute('**/api/expenses');
  await page.reload();
  await fill(page, '20,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await page.getByRole('link', { name: 'Ver despesas' }).click();
  await page.route('**/api/expenses/*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'RESOURCE_UNAVAILABLE', message: 'Este lançamento não está disponível.' },
      }),
    }),
  );
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText('não está disponível');
  await expect(page.getByRole('button', { name: 'Voltar para despesas' })).toBeVisible();
});

for (const width of [360, 390, 768, 1366]) {
  test(`despesas responsivas em ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, request);
    const startedAt = Date.now();
    await page.goto('/despesas/nova');
    await fill(page, '12,00');
    await page.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect(page.getByText('Despesa salva com sucesso.')).toBeVisible();
    expect(Date.now() - startedAt).toBeLessThan(30_000);
    for (const path of ['/despesas', '/despesas/nova']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });
}
