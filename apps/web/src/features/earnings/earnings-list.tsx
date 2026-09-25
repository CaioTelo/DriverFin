'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, listEarnings, type PageResult, type Earning } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
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
  if (loading && !result) return <p aria-busy="true">Carregando ganhos…</p>;
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
      <div className="records">
        {result.items.map((item) => (
          <article className="record card" key={item.id}>
            <div>
              <strong>{item.platform.name}</strong>
              <span>{formatDate(item.date)}</span>
            </div>
            <strong>{formatMoney(item.amount)}</strong>
            <p>
              {item.rides} corridas · {item.hours} h · {item.kilometers} km
            </p>
            <Link href={`/ganhos/${item.id}/editar`}>Consultar ou editar</Link>
          </article>
        ))}
      </div>
      <nav className="pagination" aria-label="Paginação de ganhos">
        <button disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          disabled={page * result.pageSize >= result.total || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Próxima
        </button>
      </nav>
    </>
  );
}
