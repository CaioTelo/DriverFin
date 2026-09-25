import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export abstract class PasswordMailer {
  abstract sendPasswordReset(email: string, token: string): Promise<boolean>;
}

@Injectable()
export class ResendPasswordMailer implements PasswordMailer {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM');
    if (!apiKey || !from) return false;
    const origin = this.config.getOrThrow<string>('WEB_ORIGIN');
    const link = `${origin}/redefinir-senha#token=${encodeURIComponent(token)}`;
    try {
      const result = await new Resend(apiKey).emails.send({
        from,
        to: email,
        subject: 'Redefina sua senha no DriverFin',
        text: `Use este link para redefinir sua senha no DriverFin: ${link}\n\nO link expira em 30 minutos.`,
      });
      return !result.error;
    } catch {
      return false;
    }
  }
}
