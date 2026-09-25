import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../authenticated-user.js';
import { IS_PUBLIC_KEY } from '../public.decorator.js';

interface AccessClaims {
  sub?: unknown;
  sid?: unknown;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.bearerToken(request);
    if (!token) throw this.unauthorized();
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        algorithms: ['HS256'],
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
      });
      if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string')
        throw this.unauthorized();
      const session = await this.prisma.authSession.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, userId: true },
      });
      if (!session) throw this.unauthorized();
      request.auth = { id: session.userId, sessionId: session.id };
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private bearerToken(request: Request): string | undefined {
    const [scheme, token, extra] = request.header('Authorization')?.split(' ') ?? [];
    return scheme === 'Bearer' && token && !extra ? token : undefined;
  }

  private unauthorized() {
    return new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Sua sessão não é válida.',
      writeOutcome: 'not_applied',
    });
  }
}
