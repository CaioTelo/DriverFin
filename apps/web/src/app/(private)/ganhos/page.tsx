import Link from 'next/link';
import { EarningsList } from '@/features/earnings/earnings-list';
import { AppIcon } from '@/components/ui/app-icon';
export default function EarningsPage() {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Receitas</p>
          <h1>Ganhos</h1>
          <p>Acompanhe seus ganhos por plataforma.</p>
        </div>
        <Link className="button-link" href="/ganhos/novo">
          <AppIcon name="plus" />
          Novo ganho
        </Link>
      </div>
      <EarningsList />
    </section>
  );
}
