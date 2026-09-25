'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardResult } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';

type Distribution = Array<{ id: string; name: string; amount: string }>;

export function PlatformRevenueChart({ data }: { data: Distribution }) {
  return <DistributionChart title="Receita por aplicativo" data={data} color="#177245" />;
}

export function CategoryExpensesChart({ data }: { data: Distribution }) {
  return <DistributionChart title="Gastos por categoria" data={data} color="#b45309" />;
}

function DistributionChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Distribution;
  color: string;
}) {
  const chartData = data.map((item) => ({ ...item, numericAmount: Number(item.amount) }));
  return (
    <section className="chart-card card">
      <h2>{title}</h2>
      {data.length ? (
        <>
          <div className="chart-box">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={1}
              initialDimension={{ width: 480, height: 320 }}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 12, right: 18 }}
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip content={<DistributionTooltip />} />
                <Bar dataKey="numericAmount" fill={color} name={title} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="chart-values" aria-label={`Valores de ${title}`}>
            {data.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <strong>{formatMoney(item.amount)}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Nenhum valor para exibir neste período.</p>
      )}
    </section>
  );
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; amount: string } }>;
}) {
  const item = payload?.[0]?.payload;
  return active && item ? (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatMoney(item.amount)}</span>
    </div>
  ) : null;
}

export function FinancialEvolutionChart({ data }: { data: DashboardResult['evolution'] }) {
  const chartData = data.map((item) => ({
    ...item,
    revenueNumber: Number(item.revenue),
    expensesNumber: Number(item.expenses),
    profitNumber: Number(item.profit),
  }));
  const hasValues = data.some((item) => item.revenue !== '0.00' || item.expenses !== '0.00');
  return (
    <section className="chart-card card chart-wide">
      <h2>Evolução financeira</h2>
      {hasValues ? (
        <>
          <div className="chart-box">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={1}
              initialDimension={{ width: 800, height: 320 }}
            >
              <LineChart
                data={chartData}
                margin={{ left: 4, right: 12, top: 8, bottom: 8 }}
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(8, 10)} />
                <YAxis />
                <Tooltip content={<EvolutionTooltip />} />
                <Legend />
                <Line
                  type="linear"
                  dataKey="revenueNumber"
                  name="Receita"
                  stroke="#177245"
                  strokeWidth={2}
                />
                <Line
                  type="linear"
                  dataKey="expensesNumber"
                  name="Despesas"
                  stroke="#b45309"
                  strokeWidth={2}
                />
                <Line
                  type="linear"
                  dataKey="profitNumber"
                  name="Lucro"
                  stroke="#2563a8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="sr-table" tabIndex={0} aria-label="Tabela da evolução financeira">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Receita</th>
                  <th>Despesas</th>
                  <th>Lucro</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.date}>
                    <td>{formatDate(item.date)}</td>
                    <td>{formatMoney(item.revenue)}</td>
                    <td>{formatMoney(item.expenses)}</td>
                    <td>{formatMoney(item.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>Nenhuma movimentação para exibir neste período.</p>
      )}
    </section>
  );
}

function EvolutionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardResult['evolution'][number] }>;
}) {
  const item = payload?.[0]?.payload;
  return active && item ? (
    <div className="chart-tooltip">
      <strong>{formatDate(item.date)}</strong>
      <span>Receita: {formatMoney(item.revenue)}</span>
      <span>Despesas: {formatMoney(item.expenses)}</span>
      <span>Lucro: {formatMoney(item.profit)}</span>
    </div>
  ) : null;
}
