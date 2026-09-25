import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { maximumVehicleYear } from '../common/calendar/calendar.js';
import { SystemClock } from '../common/calendar/clock.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';

const FUELS = [
  ['GASOLINE', 'Gasolina'],
  ['ETHANOL', 'Etanol'],
  ['FLEX', 'Flex'],
  ['DIESEL', 'Diesel'],
  ['CNG', 'GNV'],
  ['ELECTRIC', 'Elétrico'],
  ['HYBRID', 'Híbrido'],
  ['OTHER', 'Outro'],
] as const;

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  fuels() {
    return { items: FUELS.map(([id, name]) => ({ id, name })) };
  }

  async me(userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { userId } });
    return { vehicle: vehicle ? this.publicVehicle(vehicle) : null };
  }

  async create(userId: string, sessionId: string, input: CreateVehicleDto) {
    if (input.year > maximumVehicleYear(new SystemClock()))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Revise os campos informados.',
        fields: { year: ['Informe um ano válido.'] },
        writeOutcome: 'not_applied',
      });
    try {
      const vehicle = await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const session = await transaction.authSession.findFirst({
          where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
        });
        if (!session)
          throw new UnauthorizedException({
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Sua sessão não é válida.',
            writeOutcome: 'not_applied',
          });
        if (await transaction.vehicle.findUnique({ where: { userId } })) throw this.alreadyExists();
        return transaction.vehicle.create({
          data: {
            userId,
            brand: input.brand,
            model: input.model,
            year: input.year,
            fuel: input.fuel,
            plate: input.plate ?? null,
          },
        });
      });
      return this.publicVehicle(vehicle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw this.alreadyExists();
      throw error;
    }
  }

  private publicVehicle(vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    fuel: string;
    plate: string | null;
  }) {
    return {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      fuel: vehicle.fuel,
      plate: vehicle.plate,
    };
  }
  private alreadyExists() {
    return new ConflictException({
      code: 'VEHICLE_ALREADY_EXISTS',
      message: 'Você já possui um veículo cadastrado.',
      writeOutcome: 'not_applied',
    });
  }
}
