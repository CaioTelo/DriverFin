import { DashboardView } from '@/features/dashboard/dashboard-view';

export default function DashboardPage() {
  return (
    <section className="page dashboard-page">
      <p className="eyebrow">Visão geral</p>
      <h1>Dashboard</h1>
      <DashboardView />
    </section>
  );
}
