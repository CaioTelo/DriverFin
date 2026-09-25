import Link from 'next/link';
import { ExpensesList } from '@/features/expenses/expenses-list';
export default function ExpensesPage() {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Custos</p>
          <h1>Despesas</h1>
        </div>
        <Link className="button-link" href="/despesas/nova">
          Nova despesa
        </Link>
      </div>
      <ExpensesList />
    </section>
  );
}
