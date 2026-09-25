'use client';
import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, register } from '@/lib/api-client';
import { useAuth } from './auth-provider';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'register') {
        await register(
          String(data.get('name')),
          String(data.get('email')),
          String(data.get('password')),
        );
        router.push('/login?registered=1');
      } else {
        await auth.signIn(String(data.get('email')), String(data.get('password')));
        router.replace('/dashboard');
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {mode === 'register' && (
        <label>
          Nome
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
      )}
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          maxLength={128}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} type="submit">
        {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>
    </form>
  );
}
