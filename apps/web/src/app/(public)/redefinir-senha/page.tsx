import { ResetPasswordForm } from '@/features/auth/password-recovery-form';
import { AuthLayout } from '@/components/layout/auth-layout';
export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Defina uma nova senha" subtitle="Escolha uma senha segura para sua conta.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
