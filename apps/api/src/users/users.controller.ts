import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user.id);
  }
}
