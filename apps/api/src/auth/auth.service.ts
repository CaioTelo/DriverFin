import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.js';
import { PasswordMailer } from './password-mailer.js';
import { AuthConcurrencyProbe } from './auth-concurrency-probe.js';

const ACCESS_TOKEN_SECONDS = 900;
const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;
const RESET_TOKEN_SECONDS = 30 * 60;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: 900;
  refreshToken: string;
  refreshMaxAgeSeconds: number;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('driverfin-invalid-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwordMailer: PasswordMailer,
    private readonly concurrencyProbe: AuthConcurrencyProbe,
  ) {}

  async register(input: RegisterDto): Promise<PublicUser> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 100) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Revise os campos informados.',
        fields: { name: ['Nome deve ter entre 1 e 100 caracteres.'] },
        writeOutcome: 'not_applied',
      });
    }
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await this.prisma.user.create({ data: { name, email, passwordHash } });
      return this.publicUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este e-mail já está cadastrado.',
          writeOutcome: 'not_applied',
        });
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const candidate =
      email.length <= 254 ? await this.prisma.user.findUnique({ where: { email } }) : null;
    const passwordHash = candidate?.passwordHash ?? (await this.dummyHash);
    const matches =
      password.length >= 8 && password.length <= 128
        ? await verifyPassword(passwordHash, password)
        : false;
    if (!candidate || !matches) throw this.invalidCredentials();
    await this.concurrencyProbe.afterPasswordVerified();

    const refreshToken = randomBytes(32).toString('base64url');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_SECONDS * 1000);

    const session = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${candidate.id}::uuid FOR UPDATE`;
      const current = await transaction.user.findUnique({ where: { id: candidate.id } });
      if (!current || current.passwordHash !== candidate.passwordHash)
        throw this.invalidCredentials();
      return transaction.authSession.create({
        data: { userId: candidate.id, refreshTokenHash, expiresAt, createdAt: now },
      });
    });

    const accessToken = await this.jwt.signAsync({ sub: candidate.id, sid: session.id });
    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken,
      refreshMaxAgeSeconds: REFRESH_TOKEN_SECONDS,
      user: this.publicUser(candidate),
    };
  }

  async refresh(refreshToken: string | undefined): Promise<LoginResult> {
    if (!refreshToken) throw this.invalidSession();
    const refreshTokenHash = this.tokenHash(refreshToken);
    const candidate = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });
    if (!candidate) throw this.invalidSession();

    const session = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId}::uuid FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${candidate.id}::uuid FOR UPDATE`;
      return transaction.authSession.findUnique({
        where: { id: candidate.id },
        include: { user: true },
      });
    });
    if (
      !session ||
      session.refreshTokenHash !== refreshTokenHash ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    )
      throw this.invalidSession();

    return {
      accessToken: await this.jwt.signAsync({ sub: session.userId, sid: session.id }),
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken,
      refreshMaxAgeSeconds: Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
      ),
      user: this.publicUser(session.user),
    };
  }

  async logout(refreshToken: string | undefined, authorization: string | undefined): Promise<void> {
    const refreshHash = refreshToken ? this.tokenHash(refreshToken) : undefined;
    let session = refreshHash
      ? await this.prisma.authSession.findUnique({ where: { refreshTokenHash: refreshHash } })
      : null;
    if (!session) {
      const [scheme, token, extra] = authorization?.split(' ') ?? [];
      if (scheme === 'Bearer' && token && !extra) {
        try {
          const claims = await this.jwt.verifyAsync<{ sub?: unknown; sid?: unknown }>(token, {
            algorithms: ['HS256'],
            issuer: this.config.getOrThrow('JWT_ISSUER'),
            audience: this.config.getOrThrow('JWT_AUDIENCE'),
            ignoreExpiration: true,
          });
          if (typeof claims.sub === 'string' && typeof claims.sid === 'string') {
            session = await this.prisma.authSession.findFirst({
              where: { id: claims.sid, userId: claims.sub },
            });
          }
        } catch {
          /* Invalid optional access tokens do not reveal session state. */
        }
      }
    }
    if (!session) return;
    const target = session;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${target.userId}::uuid FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${target.id}::uuid FOR UPDATE`;
      await transaction.authSession.updateMany({
        where: { id: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.tokenHash(token);
    const created = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_SECONDS * 1000),
      },
      select: { id: true },
    });
    const sent = await this.passwordMailer.sendPasswordReset(user.email, token);
    if (!sent) {
      await this.prisma.passwordResetToken.updateMany({
        where: { id: created.id, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    const tokenHash = this.tokenHash(token);
    const candidate = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!candidate) throw this.invalidResetToken();
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId}::uuid FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM password_reset_tokens WHERE id = ${candidate.id}::uuid FOR UPDATE`;
      const current = await transaction.passwordResetToken.findUnique({
        where: { id: candidate.id },
      });
      if (
        !current ||
        current.tokenHash !== tokenHash ||
        current.usedAt ||
        current.revokedAt ||
        current.expiresAt.getTime() <= now.getTime()
      )
        throw this.invalidResetToken();
      await transaction.user.update({ where: { id: current.userId }, data: { passwordHash } });
      await transaction.passwordResetToken.update({
        where: { id: current.id },
        data: { usedAt: now },
      });
      await transaction.passwordResetToken.updateMany({
        where: { userId: current.userId, id: { not: current.id }, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.authSession.updateMany({
        where: { userId: current.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  refreshCookieOptions(maxAgeSeconds: number) {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: maxAgeSeconds * 1000,
    };
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_SESSION',
      message: 'Sua sessão não é válida.',
      writeOutcome: 'not_applied',
    });
  }

  private invalidResetToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_RESET_TOKEN',
      message: 'Este link é inválido ou expirou.',
      writeOutcome: 'not_applied',
    });
  }

  private publicUser(user: { id: string; name: string; email: string }): PublicUser {
    return { id: user.id, name: user.name, email: user.email };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha inválidos.',
      writeOutcome: 'not_applied',
    });
  }
}
