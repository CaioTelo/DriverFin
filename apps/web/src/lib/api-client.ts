export type WriteOutcome = 'not_applied' | 'rolled_back' | 'unknown';
export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  writeOutcome?: WriteOutcome;
  requestId?: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public error: ApiErrorBody,
  ) {
    super(error.message);
  }
}
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface CatalogItem {
  id: string;
  name: string;
}
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  fuel: string;
  plate: string | null;
}
export interface EarningInput {
  date: string;
  platformId: string;
  amount: string;
  rides: number;
  hours: string;
  kilometers: string;
}
export interface Earning extends Omit<EarningInput, 'platformId'> {
  id: string;
  platform: CatalogItem;
  createdAt: string;
  updatedAt: string;
}
export interface ExpenseInput {
  date: string;
  categoryId: string;
  amount: string;
  description?: string;
}
export interface Expense extends Omit<ExpenseInput, 'categoryId' | 'description'> {
  id: string;
  category: CatalogItem;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: 20;
  total: number;
}
export type DashboardPeriod = 'today' | 'week' | 'month';
export interface DashboardMetric {
  value: string | null;
  reason: 'NO_REVENUE' | 'NO_HOURS' | 'NO_KILOMETERS' | null;
}
export interface DashboardResult {
  period: {
    key: DashboardPeriod;
    startDate: string;
    endDate: string;
    seriesEndDate: string;
    timezone: string;
  };
  totals: { revenue: string; expenses: string; profit: string; hours: string; kilometers: string };
  indicators: {
    margin: DashboardMetric;
    revenuePerHour: DashboardMetric;
    profitPerHour: DashboardMetric;
    revenuePerKm: DashboardMetric;
    profitPerKm: DashboardMetric;
  };
  revenueByPlatform: Array<CatalogItem & { amount: string }>;
  expensesByCategory: Array<CatalogItem & { amount: string }>;
  evolution: Array<{ date: string; revenue: string; expenses: string; profit: string }>;
  recentEntries: Array<{
    id: string;
    type: 'earning' | 'expense';
    date: string;
    label: string;
    amount: string;
    createdAt: string;
  }>;
  hasEntries: boolean;
}
interface AuthResult {
  accessToken: string;
  expiresIn: 900;
  user: User;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResult> | null = null;
let automaticRefreshBlocked = false;
let credentialVersion = 0;
const writeHeaders = { 'Content-Type': 'application/json', 'X-DriverFin-Client': 'web' };

async function body<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const value = (await response.json().catch(() => undefined)) as
    | (T & { error?: ApiErrorBody })
    | undefined;
  if (!response.ok)
    throw new ApiError(
      response.status,
      value?.error ?? {
        code: 'UNEXPECTED_ERROR',
        message: 'Não foi possível concluir a operação.',
      },
    );
  return value as T;
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  try {
    return body<T>(
      await fetch(`/api${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' }),
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mutating = init.method !== undefined && init.method !== 'GET';
    throw new ApiError(0, {
      code: mutating ? 'WRITE_OUTCOME_UNKNOWN' : 'NETWORK_ERROR',
      message: mutating
        ? 'Não foi possível confirmar o resultado. Consulte os dados antes de tentar novamente.'
        : 'Não foi possível consultar os dados. Tente novamente.',
      writeOutcome: mutating ? 'unknown' : undefined,
    });
  }
}

async function renew(): Promise<AuthResult> {
  if (automaticRefreshBlocked)
    throw new ApiError(401, { code: 'SESSION_BLOCKED', message: 'Entre novamente.' });
  const version = credentialVersion;
  refreshInFlight ??= raw<AuthResult>('/auth/refresh', {
    method: 'POST',
    headers: writeHeaders,
    body: '{}',
  })
    .then((result) => {
      if (version === credentialVersion) accessToken = result.accessToken;
      return result;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  try {
    return await raw<T>(path, init);
  } catch (error) {
    if (
      retry &&
      error instanceof ApiError &&
      error.status === 401 &&
      error.error.writeOutcome === 'not_applied' &&
      !path.startsWith('/auth/')
    ) {
      await renew();
      return raw<T>(path, init);
    }
    throw error;
  }
}

export async function initializeSession(): Promise<User> {
  const auth = await renew();
  const user = await apiRequest<User>('/users/me', {}, false);
  return { ...auth.user, ...user };
}
export async function login(email: string, password: string): Promise<User> {
  automaticRefreshBlocked = false;
  const result = await raw<AuthResult>('/auth/login', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify({ email, password }),
  });
  credentialVersion += 1;
  accessToken = result.accessToken;
  return result.user;
}
export async function register(name: string, email: string, password: string): Promise<User> {
  const result = await raw<{ user: User }>('/auth/register', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify({ name, email, password }),
  });
  return result.user;
}
export async function logout(): Promise<'confirmed' | 'unknown'> {
  automaticRefreshBlocked = true;
  credentialVersion += 1;
  accessToken = null;
  try {
    await raw<void>('/auth/logout', { method: 'POST', headers: writeHeaders, body: '{}' });
    return 'confirmed';
  } catch (error) {
    if (error instanceof ApiError && error.error.writeOutcome === 'unknown') return 'unknown';
    throw error;
  }
}
export function clearSession() {
  credentialVersion += 1;
  accessToken = null;
}
export function allowAutomaticRefresh() {
  automaticRefreshBlocked = false;
}
export async function forgotPassword(email: string): Promise<string> {
  const result = await raw<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify({ email }),
  });
  return result.message;
}
export async function resetPassword(token: string, password: string): Promise<void> {
  await raw<void>('/auth/reset-password', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify({ token, password }),
  });
  credentialVersion += 1;
  accessToken = null;
  automaticRefreshBlocked = true;
}
export const getProfile = () => apiRequest<User>('/users/me');
export const getVehicle = () => apiRequest<{ vehicle: Vehicle | null }>('/vehicles/me');
export const getFuels = () => apiRequest<{ items: CatalogItem[] }>('/vehicles/fuels');
export const createVehicle = (input: Omit<Vehicle, 'id'>) =>
  apiRequest<Vehicle>('/vehicles', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(input),
  });
export const getPlatforms = () => apiRequest<{ items: CatalogItem[] }>('/platforms');
export const listEarnings = (page = 1) => apiRequest<PageResult<Earning>>(`/earnings?page=${page}`);
export const getEarning = (id: string) => apiRequest<Earning>(`/earnings/${id}`);
export const createEarning = (input: EarningInput) =>
  apiRequest<Earning>('/earnings', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(input),
  });
export const updateEarning = (id: string, input: EarningInput) =>
  apiRequest<Earning>(`/earnings/${id}`, {
    method: 'PUT',
    headers: writeHeaders,
    body: JSON.stringify(input),
  });
export const deleteEarning = (id: string) =>
  apiRequest<void>(`/earnings/${id}`, { method: 'DELETE', headers: writeHeaders, body: '{}' });
export const getExpenseCategories = () =>
  apiRequest<{ items: CatalogItem[] }>('/expense-categories');
export const listExpenses = (page = 1) => apiRequest<PageResult<Expense>>(`/expenses?page=${page}`);
export const getExpense = (id: string) => apiRequest<Expense>(`/expenses/${id}`);
export const createExpense = (input: ExpenseInput) =>
  apiRequest<Expense>('/expenses', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(input),
  });
export const updateExpense = (id: string, input: ExpenseInput) =>
  apiRequest<Expense>(`/expenses/${id}`, {
    method: 'PUT',
    headers: writeHeaders,
    body: JSON.stringify(input),
  });
export const deleteExpense = (id: string) =>
  apiRequest<void>(`/expenses/${id}`, { method: 'DELETE', headers: writeHeaders, body: '{}' });
export const getDashboard = (period: DashboardPeriod, signal?: AbortSignal) =>
  apiRequest<DashboardResult>(`/dashboard?period=${period}`, { signal });
