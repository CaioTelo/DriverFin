import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const headers = { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' };

async function login(page: Page, request: APIRequestContext) {
  const email = `dashboard-${unique()}@example.com`;
  const registration = await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers,
    data: { name: 'Dashboard E2E', email, password: 'senha dashboard e2e' },
  });
  expect(registration.ok(), await registration.text()).toBe(true);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha dashboard e2e');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function createEarning(page: Page, amount = '300,00') {
  await page.goto('/ganhos/novo');
  await page.getByLabel('Plataforma').selectOption('UBER');
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Quantidade de corridas').fill('12');
  await page.getByLabel('Horas trabalhadas').fill('6');
  await page.getByLabel('Quilômetros rodados').fill('100');
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await expect(page.getByText('Ganho salvo com sucesso.')).toBeVisible();
}

async function createExpense(page: Page, amount = '120,00') {
  await page.goto('/despesas/nova');
  await page.getByLabel('Valor').fill(amount);
  await page.getByLabel('Categoria').selectOption('FUEL');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa salva com sucesso.')).toBeVisible();
}

function metric(page: Page, label: string) {
  return page.locator('.metric-card').filter({ has: page.getByRole('heading', { name: label }) });
}

test('exibe os 12 componentes, três filtros, precisão, toque e dados atuais após mutações', async ({
  page,
  request,
}) => {
  await login(page, request);
  await createEarning(page);
  await createExpense(page);
  await page.goto('/dashboard');
  await expect(metric(page, 'Receita total')).toContainText('R$ 300,00');
  await expect(metric(page, 'Despesas totais')).toContainText('R$ 120,00');
  await expect(metric(page, 'Lucro líquido')).toContainText('R$ 180,00');
  await expect(metric(page, 'Margem de lucro')).toContainText('60,00%');
  await expect(metric(page, 'Receita por hora')).toContainText('R$ 50,00');
  await expect(metric(page, 'Lucro por hora')).toContainText('R$ 30,00');
  await expect(metric(page, 'Receita por km')).toContainText('R$ 3,00');
  await expect(metric(page, 'Lucro por km')).toContainText('R$ 1,80');
  for (const heading of [
    'Receita por aplicativo',
    'Gastos por categoria',
    'Evolução financeira',
    'Últimos lançamentos',
  ])
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  for (const filter of ['Hoje', 'Semana', 'Mês']) {
    await page
      .getByRole('button', { name: filter })
      .dispatchEvent('pointerdown', { pointerType: 'touch' });
    await page.getByRole('button', { name: filter }).click();
    await expect(metric(page, 'Receita total')).toContainText('R$ 300,00');
  }
  await page.goto('/despesas');
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await page.getByLabel('Valor').fill('100,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await page.goto('/dashboard');
  await expect(metric(page, 'Lucro líquido')).toContainText('R$ 200,00');
  await page.goto('/ganhos');
  await page.getByRole('link', { name: 'Consultar ou editar' }).click();
  await page.getByLabel('Valor').fill('250,00');
  await page.getByRole('button', { name: 'Salvar ganho' }).click();
  await page.goto('/dashboard');
  await expect(metric(page, 'Lucro líquido')).toContainText('R$ 150,00');
});

test('troca rápida não aceita resposta antiga e falha permite retentativa', async ({
  page,
  request,
}) => {
  await login(page, request);
  let failed = false;
  await page.route('**/api/dashboard?period=*', async (route) => {
    if (!failed) {
      failed = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto('/dashboard');
  await expect(page.locator('.dashboard-loading')).toBeVisible();
  await expect(page.locator('.error[role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Sem lançamentos neste período')).toBeVisible();
  await page.getByRole('button', { name: 'Hoje' }).click();
  await page.getByRole('button', { name: 'Semana' }).click();
  await page.getByRole('button', { name: 'Mês' }).click();
  await expect(page.getByRole('button', { name: 'Mês' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Sem lançamentos neste período')).toBeVisible();
});

test('exibe o fim inclusivo do filtro e não o fim parcial da série', async ({ page, request }) => {
  await login(page, request);
  const responsePromise = page.waitForResponse('**/api/dashboard?period=month');
  await page.goto('/dashboard');
  const payload = (await responsePromise).json() as Promise<{
    period: { startDate: string; endDate: string; seriesEndDate: string };
  }>;
  const { period } = await payload;
  const format = (value: string) => value.split('-').reverse().join('/');
  await expect(page.locator('.dashboard-range')).toHaveText(
    `${format(period.startDate)} a ${format(period.endDate)}`,
  );
  expect(period.endDate >= period.seriesEndDate).toBe(true);
});

for (const width of [360, 390, 768, 1366])
  test(`dashboard responsivo e acessível em ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, request);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Nenhuma movimentação para exibir neste período.')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

test.describe('outro fuso', () => {
  test.use({ timezoneId: 'Pacific/Honolulu' });
  test('datas e período continuam definidos pela API', async ({ page, request }) => {
    await login(page, request);
    await page.goto('/dashboard');
    await expect(page.getByText(/ a /)).toBeVisible();
  });
});
