import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';
export default function RegisterPage() {
  return (
    <main className="center">
      <section className="card">
        <p className="eyebrow">DriverFin</p>
        <h1>Crie sua conta</h1>
        <AuthForm mode="register" />
        <p>
          Já possui conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
