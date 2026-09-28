import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';
import { AuthLayout } from '@/components/layout/auth-layout';
export default function LoginPage() {
  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para acompanhar seus resultados.">
      <AuthForm mode="login" />
      <p className="auth-links">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
        <span aria-hidden="true">·</span>
        <Link href="/cadastro">Criar conta</Link>
      </p>
    </AuthLayout>
  );
}
