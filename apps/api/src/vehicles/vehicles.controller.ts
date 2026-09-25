import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}
  @Get('me') me(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicles.me(user.id);
  }
  @Get('fuels') fuels() {
    return this.vehicles.fuels();
  }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateVehicleDto) {
    return this.vehicles.create(user.id, user.sessionId, input);
  }
}
