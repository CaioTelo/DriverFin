'use client';
import { type FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  createExpense,
  getExpenseCategories,
  type CatalogItem,
  type Expense,
  type ExpenseInput,
  updateExpense,
} from '@/lib/api-client';
import { normalizeDecimal, productToday } from '@/lib/format';
import { FieldError } from '@/components/feedback/field-error';
export function ExpenseForm({
  expense,
  onSubmitStart,
  onSaved,
}: {
  expense?: Expense;
  onSubmitStart?(): void;
  onSaved(result: Expense): void;
}) {
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  useEffect(() => {
    void getExpenseCategories()
      .then((result) => setCategories(result.items))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar as categorias.',
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
    const input: ExpenseInput = {
      amount: normalizeDecimal(String(data.get('amount'))),
      categoryId: String(data.get('categoryId')),
      date: String(data.get('date')),
      description: String(data.get('description')).trim() || undefined,
    };
    try {
      onSaved(expense ? await updateExpense(expense.id, input) : await createExpense(input));
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.error.fields ?? {});
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar a despesa.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="domain-form card" onSubmit={submit} noValidate>
      <label>
        Valor
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="0,00"
          autoFocus
          defaultValue={expense?.amount.replace('.', ',')}
          aria-invalid={Boolean(fieldErrors.amount)}
          aria-describedby={fieldErrors.amount ? 'expense-amount-error' : undefined}
        />
        <FieldError id="expense-amount-error" messages={fieldErrors.amount} />
      </label>
      <label>
        Categoria
        <select
          name="categoryId"
          required
          defaultValue={expense?.category.id ?? ''}
          aria-invalid={Boolean(fieldErrors.categoryId)}
          aria-describedby={fieldErrors.categoryId ? 'expense-category-error' : undefined}
        >
          <option value="" disabled>
            Selecione
          </option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <FieldError id="expense-category-error" messages={fieldErrors.categoryId} />
      </label>
      <label>
        Data
        <input
          name="date"
          type="date"
          required
          max={productToday()}
          defaultValue={expense?.date ?? productToday()}
          aria-invalid={Boolean(fieldErrors.date)}
          aria-describedby={fieldErrors.date ? 'expense-date-error' : undefined}
        />
        <FieldError id="expense-date-error" messages={fieldErrors.date} />
      </label>
      <label>
        Descrição <span>(opcional)</span>
        <textarea
          name="description"
          maxLength={500}
          rows={4}
          defaultValue={expense?.description ?? ''}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'expense-description-error' : undefined}
        />
        <FieldError id="expense-description-error" messages={fieldErrors.description} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar despesa'}
      </button>
    </form>
  );
}
