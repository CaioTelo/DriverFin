import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { PageQueryDto } from '../common/validation/page-query.dto.js';
import { SaveEarningDto } from './dto/save-earning.dto.js';
import { EarningsService } from './earnings.service.js';

@Controller()
export class EarningsController {
  constructor(private readonly earnings: EarningsService) {}
  @Get('platforms') platforms() {
    return this.earnings.platforms();
  }
  @Get('earnings') list(@CurrentUser() user: AuthenticatedUser, @Query() query: PageQueryDto) {
    return this.earnings.list(user.id, query.page);
  }
  @Get('earnings/:id') findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.earnings.findOne(user.id, id);
  }
  @Post('earnings') create(@CurrentUser() user: AuthenticatedUser, @Body() input: SaveEarningDto) {
    return this.earnings.create(user.id, user.sessionId, input);
  }
  @Put('earnings/:id') update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SaveEarningDto,
  ) {
    return this.earnings.update(user.id, user.sessionId, id, input);
  }
  // Keep method decorators vertically aligned for readability.
  // prettier-ignore
  @Delete('earnings/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.earnings.remove(user.id, user.sessionId, id);
  }
}
