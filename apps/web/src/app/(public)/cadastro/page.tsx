import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';
import { AuthLayout } from '@/components/layout/auth-layout';
export default function RegisterPage() {
  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Comece a organizar seus números em poucos minutos."
    >
      <AuthForm mode="register" />
      <p className="auth-links">
        <span>Já possui uma conta?</span>
        <Link href="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
