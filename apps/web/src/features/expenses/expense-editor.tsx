'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, deleteExpense, getExpense, type Expense } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import { ExpenseForm } from './expense-form';

export function ExpenseEditor({ id }: { id: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getExpense(id)
      .then(setExpense)
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar a despesa.',
        ),
      );
  }, [id]);

  async function remove() {
    if (!expense || busy) return;
    setSaved(false);
    setBusy(true);
    setError(null);
    try {
      await deleteExpense(expense.id);
      dialog.current?.close();
      router.replace('/despesas?removed=1');
    } catch (caught) {
      dialog.current?.close();
      setError(
        caught instanceof ApiError && caught.error.writeOutcome === 'unknown'
          ? 'Não foi possível confirmar a exclusão. Consulte a lista antes de tentar novamente.'
          : caught instanceof ApiError
            ? caught.message
            : 'Não foi possível excluir a despesa.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (error && !expense) {
    return (
      <div className="feedback error" role="alert">
        <p>{error}</p>
        <button onClick={() => router.replace('/despesas')}>Voltar para despesas</button>
      </div>
    );
  }
  if (!expense) return <p aria-busy="true">Carregando despesa…</p>;

  return (
    <>
      {saved && (
        <p className="success" role="status">
          Despesa atualizada com sucesso.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ExpenseForm
        expense={expense}
        onSubmitStart={() => {
          setSaved(false);
          setError(null);
        }}
        onSaved={(updated) => {
          setExpense(updated);
          setSaved(true);
        }}
      />
      <button className="danger" onClick={() => dialog.current?.showModal()}>
        Excluir despesa
      </button>
      <dialog ref={dialog} aria-labelledby="delete-expense-title">
        <h2 id="delete-expense-title">Excluir esta despesa?</h2>
        <p>
          {expense.category.name}, {formatDate(expense.date)}, {formatMoney(expense.amount)}.
        </p>
        <div className="dialog-actions">
          <button className="secondary" onClick={() => dialog.current?.close()}>
            Cancelar
          </button>
          <button className="danger" disabled={busy} onClick={() => void remove()}>
            {busy ? 'Excluindo…' : 'Confirmar exclusão'}
          </button>
        </div>
      </dialog>
    </>
  );
}
