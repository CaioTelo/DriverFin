import { ExpenseEditor } from '@/features/expenses/expense-editor';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="page narrow">
      <p className="eyebrow">Custos</p>
      <h1>Consultar ou editar despesa</h1>
      <ExpenseEditor id={id} />
    </section>
  );
}
