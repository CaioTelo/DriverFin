'use client';
import { useEffect, useState } from 'react';
import { ApiError, getProfile, type User } from '@/lib/api-client';
export function ProfileView() {
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getProfile()
      .then(setProfile)
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar o perfil.',
        ),
      );
  }, []);
  if (error)
    return (
      <div className="feedback error" role="alert">
        <p>{error}</p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </div>
    );
  if (!profile) return <p aria-busy="true">Carregando perfil…</p>;
  return (
    <dl className="details card">
      <div>
        <dt>Nome</dt>
        <dd>{profile.name}</dd>
      </div>
      <div>
        <dt>E-mail</dt>
        <dd>{profile.email}</dd>
      </div>
    </dl>
  );
}
