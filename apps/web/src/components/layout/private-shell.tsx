'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-provider';

export function PrivateShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);
  if (auth.status === 'initializing')
    return (
      <main className="center" aria-busy="true">
        Verificando sua sessão…
      </main>
    );
  if (auth.status === 'unavailable')
    return (
      <main className="center">
        <section className="card">
          <h1>Não foi possível verificar sua sessão</h1>
          <p>A API pode estar temporariamente indisponível. Sua sessão não foi encerrada.</p>
          <button onClick={() => void auth.revalidate()}>Tentar novamente</button>
        </section>
      </main>
    );
  if (auth.status === 'logout-unknown')
    return (
      <main className="center">
        <section className="card">
          <h1>Saída não confirmada</h1>
          <p>
            Seus dados foram removidos desta tela, mas não foi possível confirmar o encerramento no
            servidor.
          </p>
          <button onClick={() => router.replace('/login')}>Ir para o login</button>
        </section>
      </main>
    );
  if (auth.status !== 'authenticated')
    return (
      <main className="center" aria-busy="true">
        Redirecionando…
      </main>
    );
  return (
    <div className="app-shell">
      <aside>
        <Link className="brand" href="/dashboard">
          DriverFin
        </Link>
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/ganhos">Ganhos</Link>
          <Link href="/despesas">Despesas</Link>
          <Link href="/perfil">Perfil</Link>
          <Link href="/veiculo">Veículo</Link>
        </nav>
        <button onClick={() => void auth.signOut().then(() => router.replace('/login'))}>
          Sair
        </button>
      </aside>
      <main>{children}</main>
    </div>
  );
}
