import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';

export async function assertActiveSession(
  transaction: Prisma.TransactionClient,
  userId: string,
  sessionId: string,
): Promise<void> {
  await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  const session = await transaction.authSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!session)
    throw new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Sua sessão não é válida.',
      writeOutcome: 'not_applied',
    });
}

export function resourceUnavailable(): NotFoundException {
  return new NotFoundException({
    code: 'RESOURCE_UNAVAILABLE',
    message: 'Este lançamento não está disponível.',
    writeOutcome: 'not_applied',
  });
}
