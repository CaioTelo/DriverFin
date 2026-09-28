import Link from 'next/link';
import { ExpensesList } from '@/features/expenses/expenses-list';
import { AppIcon } from '@/components/ui/app-icon';
export default function ExpensesPage() {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Custos</p>
          <h1>Despesas</h1>
          <p>Controle seus custos do dia a dia.</p>
        </div>
        <Link className="button-link" href="/despesas/nova">
          <AppIcon name="plus" />
          Nova despesa
        </Link>
      </div>
      <ExpensesList />
    </section>
  );
}
