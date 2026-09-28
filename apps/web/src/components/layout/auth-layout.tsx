import Link from 'next/link';
import { BrandMark } from '@/components/ui/brand-mark';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="DriverFin">
        <BrandMark inverse />
        <h2>Seu trabalho na rua. Seus números sob controle.</h2>
        <p>Acompanhe ganhos, despesas e lucro real sem depender de planilhas complicadas.</p>
      </section>
      <section className="auth-content">
        <Link className="brand-link" href="/login" aria-label="DriverFin — Login">
          <BrandMark />
        </Link>
        <header className="auth-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        <div className="auth-card card">{children}</div>
      </section>
    </main>
  );
}
