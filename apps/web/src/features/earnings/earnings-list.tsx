'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, listEarnings, type PageResult, type Earning } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import { AppIcon } from '@/components/ui/app-icon';
export function EarningsList() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<Earning> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listEarnings(page);
      if (page > 1 && next.items.length === 0 && next.total > 0) {
        setPage(page - 1);
        return;
      }
      setResult(next);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Não foi possível carregar os ganhos.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading && !result)
    return (
      <div className="loading-state" aria-busy="true">
        Carregando ganhos…
      </div>
    );
  if (error)
    return (
      <div className="feedback error" role="alert">
        <p>{error}</p>
        <button onClick={() => void load()}>Tentar novamente</button>
      </div>
    );
  if (!result?.items.length)
    return (
      <div className="empty card">
        <h2>Nenhum ganho cadastrado</h2>
        <p>Registre sua primeira receita de trabalho.</p>
        <Link className="button-link" href="/ganhos/novo">
          Cadastrar ganho
        </Link>
      </div>
    );
  return (
    <>
      <div className="records records-mobile">
        {result.items.map((item) => (
          <article className="record card" key={item.id}>
            <div>
              <strong>{item.platform.name}</strong>
              <span>{formatDate(item.date)}</span>
            </div>
            <p className="record-meta">
              {item.rides} corridas · {item.hours} h · {item.kilometers} km
            </p>
            <strong className="record-amount">+ {formatMoney(item.amount)}</strong>
            <Link
              className="record-action"
              aria-label="Consultar ou editar"
              href={`/ganhos/${item.id}/editar`}
            >
              Editar <AppIcon name="chevron-right" />
            </Link>
          </article>
        ))}
      </div>
      <div className="records-table-card card">
        <table className="records-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Plataforma</th>
              <th>Corridas</th>
              <th>Horas</th>
              <th>Km</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.date)}</td>
                <td>{item.platform.name}</td>
                <td>{item.rides}</td>
                <td>{item.hours} h</td>
                <td>{item.kilometers} km</td>
                <td className="money">{formatMoney(item.amount)}</td>
                <td>
                  <Link
                    className="record-action"
                    aria-label="Consultar ou editar"
                    href={`/ganhos/${item.id}/editar`}
                  >
                    Editar <AppIcon name="chevron-right" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pagination" aria-label="Paginação de ganhos">
        <span className="pagination-summary">
          {(page - 1) * result.pageSize + 1}–{Math.min(page * result.pageSize, result.total)} de{' '}
          {result.total} lançamentos
        </span>
        <button
          aria-label="Página anterior"
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          <AppIcon name="chevron-left" />
        </button>
        <span className="pagination-current" aria-label={`Página ${page}`}>
          {page}
        </span>
        <button
          aria-label="Próxima página"
          disabled={page * result.pageSize >= result.total || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          <AppIcon name="chevron-right" />
        </button>
      </nav>
    </>
  );
}
