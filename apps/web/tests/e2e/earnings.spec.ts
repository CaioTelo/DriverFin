import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const apiHeaders = { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' };
async function login(page: Page, request: APIRequestContext) {
  const email = `earning-${unique()}@example.com`;
  await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers: apiHeaders,
    data: { name: 'Ganhos E2E', email, password: 'senha ganhos e2e' },
  });
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha ganhos e2e');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
async function fill(page: Page, amount = '300,00') {
  await page.getByLabel('Plataforma').selectOption('UBER');
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Quantidade de corridas').fill('0');
  await page.getByLabel('Horas trabalhadas').fill('0');
  await page.getByLabel('Quilômetros rodados').fill('0');
}

test('CRUD completo, zeros, registros iguais, cancelamento e persistência', async ({
  page,
  request,
}) => {
  await login(page, request);
  await page.goto('/ganhos/novo');
  await fill(page);
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await expect(page.getByText('Ganho salvo com sucesso.')).toBeVisible();
  await page.getByRole('link', { name: 'Ver ganhos' }).click();
  await expect(page.getByText('R$ 300,00')).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await page.getByLabel('Valor').fill('350,25');
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await expect(page.getByText('Ganho atualizado com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'Excluir ganho' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByLabel('Valor')).toHaveValue('350,25');
  await page.getByRole('button', { name: 'Excluir ganho' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page).toHaveURL(/\/ganhos/);
  await expect(page.getByText('Nenhum ganho cadastrado')).toBeVisible();
});

test('bloqueia duplo envio e informa resposta incerta sem repetir', async ({ page, request }) => {
  await login(page, request);
  let posts = 0;
  await page.route('**/api/earnings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    posts += 1;
    await route.abort();
  });
  await page.goto('/ganhos/novo');
  await fill(page, '10,00');
  const save = page.locator('button[type="submit"]');
  await save.click();
  await expect(page.locator('p[role="alert"]')).toContainText(
    'Não foi possível confirmar o resultado',
  );
  expect(posts).toBe(1);
});

test('sessão expirada não grava e registro removido fica indisponível', async ({
  page,
  request,
}) => {
  await login(page, request);
  let writes = 0;
  await page.route('**/api/earnings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    writes += 1;
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
  await page.goto('/ganhos/novo');
  await fill(page, '20,00');
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Sua sessão não é válida');
  expect(writes).toBe(2);
  await page.unroute('**/api/earnings');
  await page.reload();
  await fill(page, '20,00');
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await page.getByRole('link', { name: 'Ver ganhos' }).click();
  await page.route('**/api/earnings/*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'RESOURCE_UNAVAILABLE', message: 'Este lançamento não está disponível.' },
      }),
    }),
  );
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('não está disponível');
});

for (const width of [360, 390, 768, 1366])
  test(`ganhos responsivos em ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, request);
    for (const path of ['/ganhos', '/ganhos/novo']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });
