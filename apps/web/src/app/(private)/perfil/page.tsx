import { ProfileView } from '@/features/profile/profile-view';
export default function ProfilePage() {
  return (
    <section className="page">
      <p className="eyebrow">Sua conta</p>
      <h1>Perfil</h1>
      <p>Seus dados de identificação são somente para consulta.</p>
      <ProfileView />
    </section>
  );
}
