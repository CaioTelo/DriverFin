'use client';
import { useState } from 'react';
import Link from 'next/link';
import { EarningForm } from '@/features/earnings/earning-form';
export default function NewEarningPage() {
  const [saved, setSaved] = useState(false);
  return (
    <section className="page narrow">
      <p className="eyebrow">Receitas</p>
      <h1>Novo ganho</h1>
      <p className="page-subtitle">Registre os dados do seu dia de trabalho.</p>
      {saved ? (
        <div className="success" role="status">
          <p>Ganho salvo com sucesso.</p>
          <Link href="/ganhos">Ver ganhos</Link>
        </div>
      ) : (
        <EarningForm onSaved={() => setSaved(true)} />
      )}
    </section>
  );
}
