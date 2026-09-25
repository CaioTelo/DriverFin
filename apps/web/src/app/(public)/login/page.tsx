import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';
export default function LoginPage() {
  return (
    <main className="center">
      <section className="card">
        <p className="eyebrow">DriverFin</p>
        <h1>Entre na sua conta</h1>
        <AuthForm mode="login" />
        <p>
          <Link href="/recuperar-senha">Esqueci minha senha</Link>
        </p>
        <p>
          Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link>
        </p>
      </section>
    </main>
  );
}
