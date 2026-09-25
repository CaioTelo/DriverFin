import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user)
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Sua sessão não é válida.',
      });
    return user;
  }
}
