import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/password-recovery-form';
import { AuthLayout } from '@/components/layout/auth-layout';
export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Recupere sua senha"
      subtitle="Informe seu e-mail e enviaremos as instruções."
    >
      <ForgotPasswordForm />
      <p className="auth-links">
        <Link href="/login">← Voltar para o login</Link>
      </p>
    </AuthLayout>
  );
}
