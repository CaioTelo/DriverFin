'use client';
import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, forgotPassword, resetPassword } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setMessage(await forgotPassword(String(new FormData(event.currentTarget).get('email'))));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Não foi possível enviar a solicitação.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (message)
    return (
      <p className="success" role="status">
        {message}
      </p>
    );
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy}>{busy ? 'Enviando…' : 'Enviar instruções'}</button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      setToken(params.get('token'));
      window.history.replaceState(null, '', window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    const password = String(new FormData(event.currentTarget).get('password'));
    try {
      await resetPassword(token, password);
      router.replace('/login?reset=1');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível redefinir a senha.');
    } finally {
      setBusy(false);
    }
  }
  if (token === undefined) return <p aria-busy="true">Lendo link…</p>;
  if (!token)
    return (
      <div>
        <p className="error" role="alert">
          Este link é inválido ou expirou.
        </p>
        <a href="/recuperar-senha">Solicitar um novo link</a>
      </div>
    );
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Nova senha
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
      </label>
      {error && (
        <>
          <p className="error" role="alert">
            {error}
          </p>
          <a href="/recuperar-senha">Solicitar um novo link</a>
        </>
      )}
      <button disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
    </form>
  );
}
