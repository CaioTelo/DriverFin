import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/features/auth/auth-provider';

export const metadata: Metadata = {
  title: 'DriverFin',
  description: 'DriverFin — aplicação em desenvolvimento.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
