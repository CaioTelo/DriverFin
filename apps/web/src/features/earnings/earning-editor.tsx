'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, deleteEarning, getEarning, type Earning } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import { EarningForm } from './earning-form';
export function EarningEditor({ id }: { id: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [earning, setEarning] = useState<Earning | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void getEarning(id)
      .then(setEarning)
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar o ganho.',
        ),
      );
  }, [id]);
  async function remove() {
    if (!earning || busy) return;
    setSaved(false);
    setBusy(true);
    setError(null);
    try {
      await deleteEarning(earning.id);
      dialog.current?.close();
      router.replace('/ganhos?removed=1');
    } catch (caught) {
      dialog.current?.close();
      setError(
        caught instanceof ApiError && caught.error.writeOutcome === 'unknown'
          ? 'Não foi possível confirmar a exclusão. Consulte a lista antes de tentar novamente.'
          : caught instanceof ApiError
            ? caught.message
            : 'Não foi possível excluir o ganho.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (error && !earning)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!earning) return <p aria-busy="true">Carregando ganho…</p>;
  return (
    <>
      {saved && (
        <p className="success" role="status">
          Ganho atualizado com sucesso.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <EarningForm
        earning={earning}
        onSubmitStart={() => {
          setSaved(false);
          setError(null);
        }}
        onSaved={(updated) => {
          setEarning(updated);
          setSaved(true);
        }}
      />
      <button className="danger" onClick={() => dialog.current?.showModal()}>
        Excluir ganho
      </button>
      <dialog ref={dialog}>
        <h2>Excluir este ganho?</h2>
        <p>
          {earning.platform.name}, {formatDate(earning.date)}, {formatMoney(earning.amount)}.
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
