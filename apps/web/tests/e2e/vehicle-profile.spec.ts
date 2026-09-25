import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const apiHeaders = { Origin: 'http://localhost:3000', 'X-DriverFin-Client': 'web' };
async function registerAndLogin(page: Page, request: APIRequestContext, name: string) {
  const email = `${unique()}@example.com`;
  await request.post('http://127.0.0.1:3001/api/auth/register', {
    headers: apiHeaders,
    data: { name, email, password: 'senha profile e2e' },
  });
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha profile e2e');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

test('perfil próprio e veículo sem placa persistem sem oferecer edição', async ({
  page,
  request,
}) => {
  const email = await registerAndLogin(page, request, 'Motorista Perfil');
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByText('Motorista Perfil')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('button', { name: /editar/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Veículo', exact: true }).click();
  await page
    .getByLabel('Marca', { exact: true })
    .fill('Marca muito longa para conferir a quebra responsiva sem perder o conteúdo');
  await page.getByLabel('Modelo', { exact: true }).fill('Modelo E2E');
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByLabel('Combustível', { exact: true }).selectOption('FLEX');
  await page.getByRole('button', { name: 'Salvar veículo' }).click();
  await expect(page.getByText('Veículo cadastrado com sucesso.')).toBeVisible();
  await expect(page.getByText('Não informada')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Modelo E2E')).toBeVisible();
  await expect(page.getByRole('button', { name: /excluir|editar/i })).toHaveCount(0);
});

test('validação e isolamento direto entre dois usuários', async ({ page, request }) => {
  await registerAndLogin(page, request, 'Conta isolada');
  await page.goto('/veiculo');
  await page.getByLabel('Marca', { exact: true }).fill(' ');
  await page.getByLabel('Modelo', { exact: true }).fill('Modelo');
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByLabel('Combustível', { exact: true }).selectOption('FLEX');
  await page.getByRole('button', { name: 'Salvar veículo' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Revise os campos');
  const a = `${unique()}@example.com`;
  const b = `${unique()}@example.com`;
  for (const email of [a, b])
    await request.post('http://127.0.0.1:3001/api/auth/register', {
      headers: apiHeaders,
      data: { name: email, email, password: 'senha direta' },
    });
  async function token(email: string) {
    return (
      await request.post('http://127.0.0.1:3001/api/auth/login', {
        headers: apiHeaders,
        data: { email, password: 'senha direta' },
      })
    ).json();
  }
  const authA = await token(a);
  const authB = await token(b);
  const created = await request.post('http://127.0.0.1:3001/api/vehicles', {
    headers: { ...apiHeaders, Authorization: `Bearer ${authA.accessToken}` },
    data: { brand: 'A', model: 'Privado', year: 2026, fuel: 'FLEX' },
  });
  expect(created.status()).toBe(201);
  await expect(
    (
      await request.get('http://127.0.0.1:3001/api/vehicles/me', {
        headers: { Authorization: `Bearer ${authB.accessToken}` },
      })
    ).json(),
  ).resolves.toEqual({ vehicle: null });
});

for (const width of [360, 390, 768, 1366])
  test(`perfil e veículo responsivos em ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 850 });
    await registerAndLogin(page, request, `Nome ${'extenso '.repeat(8)}`);
    for (const path of ['/perfil', '/veiculo']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });
