'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { BrandMark } from '@/components/ui/brand-mark';

const navigation: Array<{ href: string; label: string; icon: AppIconName }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/ganhos', label: 'Ganhos', icon: 'earnings' },
  { href: '/despesas', label: 'Despesas', icon: 'expenses' },
  { href: '/perfil', label: 'Perfil', icon: 'profile' },
  { href: '/veiculo', label: 'Veículo', icon: 'vehicle' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function PrivateShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const moreDialog = useRef<HTMLDialogElement>(null);
  const focusedFlow = /\/(novo|nova|editar)(\/|$)/.test(pathname);
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
    <div className={`app-shell${focusedFlow ? ' focused-flow' : ''}`}>
      <aside className="desktop-sidebar">
        <Link className="brand-link" href="/dashboard" aria-label="DriverFin — Dashboard">
          <BrandMark inverse />
        </Link>
        <nav aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link
              key={item.href}
              className="sidebar-link"
              data-active={isActive(pathname, item.href) || undefined}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              <AppIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="sidebar-logout"
          onClick={() => void auth.signOut().then(() => router.replace('/login'))}
        >
          <AppIcon name="logout" />
          Sair
        </button>
      </aside>
      <header className="mobile-header">
        <Link className="brand-link" href="/dashboard" aria-label="DriverFin — Dashboard">
          <BrandMark />
        </Link>
        <span className="user-initials" aria-label={`Usuário ${auth.user?.name ?? ''}`}>
          {auth.user ? initials(auth.user.name) : ''}
        </span>
      </header>
      <main className="app-main">{children}</main>
      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        {navigation.slice(0, 4).map((item) => {
          const label = item.href === '/dashboard' ? 'Início' : item.label;
          return (
            <Link
              key={item.href}
              data-active={isActive(pathname, item.href) || undefined}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              <AppIcon name={item.icon} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          data-active={isActive(pathname, '/veiculo') || undefined}
          aria-haspopup="dialog"
          onClick={() => moreDialog.current?.showModal()}
        >
          <AppIcon name="more" />
          <span>Mais</span>
        </button>
      </nav>
      <dialog className="more-dialog" ref={moreDialog} aria-labelledby="more-title">
        <div className="dialog-handle" aria-hidden="true" />
        <h2 id="more-title">Mais opções</h2>
        <Link href="/veiculo" onClick={() => moreDialog.current?.close()}>
          <AppIcon name="vehicle" />
          Veículo
        </Link>
        <button
          type="button"
          onClick={() => {
            moreDialog.current?.close();
            void auth.signOut().then(() => router.replace('/login'));
          }}
        >
          <AppIcon name="logout" />
          Sair
        </button>
        <button className="secondary" type="button" onClick={() => moreDialog.current?.close()}>
          Cancelar
        </button>
      </dialog>
    </div>
  );
}
