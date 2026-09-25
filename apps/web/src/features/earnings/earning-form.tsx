'use client';
import { type FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  createEarning,
  getPlatforms,
  type CatalogItem,
  type Earning,
  type EarningInput,
  updateEarning,
} from '@/lib/api-client';
import { normalizeDecimal, productToday } from '@/lib/format';
import { FieldError } from '@/components/feedback/field-error';

export function EarningForm({
  earning,
  onSubmitStart,
  onSaved,
}: {
  earning?: Earning;
  onSubmitStart?(): void;
  onSaved(result: Earning): void;
}) {
  const [platforms, setPlatforms] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  useEffect(() => {
    void getPlatforms()
      .then((result) => setPlatforms(result.items))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar as plataformas.',
        ),
      );
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    onSubmitStart?.();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const input: EarningInput = {
      date: String(data.get('date')),
      platformId: String(data.get('platformId')),
      amount: normalizeDecimal(String(data.get('amount'))),
      rides: Number(data.get('rides')),
      hours: normalizeDecimal(String(data.get('hours'))),
      kilometers: normalizeDecimal(String(data.get('kilometers'))),
    };
    try {
      onSaved(earning ? await updateEarning(earning.id, input) : await createEarning(input));
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.error.fields ?? {});
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o ganho.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="domain-form card" onSubmit={submit} noValidate>
      <label>
        Data
        <input
          name="date"
          type="date"
          required
          max={productToday()}
          defaultValue={earning?.date ?? productToday()}
          aria-invalid={Boolean(fieldErrors.date)}
          aria-describedby={fieldErrors.date ? 'earning-date-error' : undefined}
        />
        <FieldError id="earning-date-error" messages={fieldErrors.date} />
      </label>
      <label>
        Plataforma
        <select
          name="platformId"
          required
          defaultValue={earning?.platform.id ?? ''}
          aria-invalid={Boolean(fieldErrors.platformId)}
          aria-describedby={fieldErrors.platformId ? 'earning-platform-error' : undefined}
        >
          <option value="" disabled>
            Selecione
          </option>
          {platforms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <FieldError id="earning-platform-error" messages={fieldErrors.platformId} />
      </label>
      <label>
        Valor
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="0,00"
          defaultValue={earning?.amount.replace('.', ',')}
          aria-invalid={Boolean(fieldErrors.amount)}
          aria-describedby={fieldErrors.amount ? 'earning-amount-error' : undefined}
        />
        <FieldError id="earning-amount-error" messages={fieldErrors.amount} />
      </label>
      <label>
        Quantidade de corridas
        <input
          name="rides"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={earning?.rides ?? 0}
          aria-invalid={Boolean(fieldErrors.rides)}
          aria-describedby={fieldErrors.rides ? 'earning-rides-error' : undefined}
        />
        <FieldError id="earning-rides-error" messages={fieldErrors.rides} />
      </label>
      <label>
        Horas trabalhadas
        <input
          name="hours"
          inputMode="decimal"
          required
          defaultValue={earning?.hours.replace('.', ',') ?? '0'}
          aria-invalid={Boolean(fieldErrors.hours)}
          aria-describedby={
            fieldErrors.hours ? 'earning-hours-error earning-parts' : 'earning-parts'
          }
        />
        <FieldError id="earning-hours-error" messages={fieldErrors.hours} />
      </label>
      <label>
        Quilômetros rodados
        <input
          name="kilometers"
          inputMode="decimal"
          required
          defaultValue={earning?.kilometers.replace('.', ',') ?? '0'}
          aria-invalid={Boolean(fieldErrors.kilometers)}
          aria-describedby={
            fieldErrors.kilometers ? 'earning-kilometers-error earning-parts' : 'earning-parts'
          }
        />
        <FieldError id="earning-kilometers-error" messages={fieldErrors.kilometers} />
      </label>
      <p id="earning-parts" className="hint">
        Horas e quilômetros são parcelas somadas nos indicadores. Em horas, 1,50 significa uma hora
        e meia.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar ganho'}
      </button>
    </form>
  );
}
