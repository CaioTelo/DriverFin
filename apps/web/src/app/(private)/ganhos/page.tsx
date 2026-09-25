import Link from 'next/link';
import { EarningsList } from '@/features/earnings/earnings-list';
export default function EarningsPage() {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Receitas</p>
          <h1>Ganhos</h1>
        </div>
        <Link className="button-link" href="/ganhos/novo">
          Novo ganho
        </Link>
      </div>
      <EarningsList />
    </section>
  );
}
