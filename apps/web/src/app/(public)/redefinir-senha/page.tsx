import { ResetPasswordForm } from '@/features/auth/password-recovery-form';
export default function ResetPasswordPage() {
  return (
    <main className="center">
      <section className="card">
        <p className="eyebrow">Recuperação</p>
        <h1>Defina uma nova senha</h1>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
