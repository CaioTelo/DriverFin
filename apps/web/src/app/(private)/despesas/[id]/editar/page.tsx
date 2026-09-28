import { ExpenseEditor } from '@/features/expenses/expense-editor';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="page narrow">
      <p className="eyebrow">Custos</p>
      <h1>Editar despesa</h1>
      <p className="page-subtitle">Revise ou atualize os dados deste lançamento.</p>
      <ExpenseEditor id={id} />
    </section>
  );
}
