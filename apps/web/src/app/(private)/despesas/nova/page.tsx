'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ExpenseForm } from '@/features/expenses/expense-form';
export default function NewExpensePage() {
  const [saved, setSaved] = useState(false);
  return (
    <section className="page narrow">
      <p className="eyebrow">Custos</p>
      <h1>Nova despesa</h1>
      {saved ? (
        <div className="success" role="status">
          <p>Despesa salva com sucesso.</p>
          <Link href="/despesas">Ver despesas</Link>
        </div>
      ) : (
        <ExpenseForm onSaved={() => setSaved(true)} />
      )}
    </section>
  );
}
