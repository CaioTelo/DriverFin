import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/password-recovery-form';
export default function ForgotPasswordPage() {
  return (
    <main className="center">
      <section className="card">
        <p className="eyebrow">Recuperação</p>
        <h1>Recupere sua senha</h1>
        <p>Informe seu e-mail. A resposta será a mesma para todas as contas.</p>
        <ForgotPasswordForm />
        <p>
          <Link href="/login">Voltar ao login</Link>
        </p>
      </section>
    </main>
  );
}
