'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getDashboard,
  type DashboardPeriod,
  type DashboardResult,
} from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import {
  CategoryExpensesChart,
  FinancialEvolutionChart,
  PlatformRevenueChart,
} from './dashboard-charts';

const periods: Array<{ key: DashboardPeriod; label: string }> = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
];
const reason = {
  NO_REVENUE: 'Sem receita no período.',
  NO_HOURS: 'Sem horas trabalhadas no período.',
  NO_KILOMETERS: 'Sem quilômetros rodados no período.',
} as const;

export function DashboardView() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [snapshot, setSnapshot] = useState<DashboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (nextPeriod: DashboardPeriod) => {
    const id = ++requestId.current;
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    try {
      const result = await getDashboard(nextPeriod, activeController.signal);
      if (id === requestId.current) setSnapshot(result);
    } catch (caught) {
      if (activeController.signal.aborted) return;
      if (id === requestId.current)
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar o dashboard.',
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(period), 0);
    return () => {
      window.clearTimeout(timer);
      controller.current?.abort();
    };
  }, [load, period]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(period);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load, period]);

  return (
    <>
      <div className="period-filter" aria-label="Período do dashboard">
        {periods.map((item) => (
          <button
            key={item.key}
            aria-pressed={period === item.key}
            disabled={loading && period === item.key}
            onClick={() => setPeriod(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading && (
        <div className="dashboard-loading card" aria-busy="true">
          Carregando indicadores…
        </div>
      )}
      {error && (
        <div className="feedback error" role="alert">
          <p>{error}</p>
          <button onClick={() => void load(period)}>Tentar novamente</button>
        </div>
      )}
      {snapshot && <DashboardSnapshot snapshot={snapshot} />}
    </>
  );
}

function DashboardSnapshot({ snapshot }: { snapshot: DashboardResult }) {
  const cards = [
    ['Receita total', { text: formatMoney(snapshot.totals.revenue), explanation: null }],
    ['Despesas totais', { text: formatMoney(snapshot.totals.expenses), explanation: null }],
    ['Lucro líquido', { text: formatMoney(snapshot.totals.profit), explanation: null }],
    ['Margem de lucro', metric(snapshot.indicators.margin, '%')],
    ['Receita por hora', metric(snapshot.indicators.revenuePerHour, 'money')],
    ['Lucro por hora', metric(snapshot.indicators.profitPerHour, 'money')],
    ['Receita por km', metric(snapshot.indicators.revenuePerKm, 'money')],
    ['Lucro por km', metric(snapshot.indicators.profitPerKm, 'money')],
  ] as const;
  return (
    <div className="dashboard-content">
      <p className="dashboard-range">
        {formatDate(snapshot.period.startDate)} a {formatDate(snapshot.period.endDate)}
      </p>
      <div className="summary-grid">
        {cards.map(([label, value]) => (
          <article className="metric-card card" key={label}>
            <h2>{label}</h2>
            <strong>{value.text}</strong>
            {value.explanation && <p>{value.explanation}</p>}
          </article>
        ))}
      </div>
      {!snapshot.hasEntries && (
        <div className="empty card">
          <h2>Sem lançamentos neste período</h2>
          <p>Cadastre ganhos e despesas para acompanhar seus resultados.</p>
        </div>
      )}
      <div className="charts-grid">
        <PlatformRevenueChart data={snapshot.revenueByPlatform} />
        <CategoryExpensesChart data={snapshot.expensesByCategory} />
        <FinancialEvolutionChart data={snapshot.evolution} />
      </div>
      <section className="recent card">
        <h2>Últimos lançamentos</h2>
        {snapshot.recentEntries.length ? (
          <ul>
            {snapshot.recentEntries.map((entry) => (
              <li key={`${entry.type}-${entry.id}`}>
                <div>
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.type === 'earning' ? 'Ganho' : 'Despesa'} · {formatDate(entry.date)}
                  </span>
                </div>
                <strong>{formatMoney(entry.amount)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum lançamento no período.</p>
        )}
      </section>
    </div>
  );
}

function metric(value: DashboardResult['indicators']['margin'], kind: '%' | 'money') {
  if (value.value === null) return { text: '—', explanation: reason[value.reason!] };
  return {
    text: kind === 'money' ? formatMoney(value.value) : `${value.value.replace('.', ',')}%`,
    explanation: null,
  };
}
