'use client';
import { useEffect, useState } from 'react';
import { ApiError, getProfile, type User } from '@/lib/api-client';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
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
  if (!profile)
    return (
      <div className="loading-state" aria-busy="true">
        Carregando perfil…
      </div>
    );
  return (
    <>
      <section className="profile-summary" aria-label="Resumo do perfil">
        <span className="profile-avatar" aria-hidden="true">
          {initials(profile.name)}
        </span>
        <div>
          <strong>{profile.name}</strong>
          <span>{profile.email}</span>
        </div>
      </section>
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
    </>
  );
}
