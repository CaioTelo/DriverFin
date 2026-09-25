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
import { SaveExpenseDto } from './dto/save-expense.dto.js';
import { ExpensesService } from './expenses.service.js';
@Controller()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}
  @Get('expense-categories') categories() {
    return this.expenses.categories();
  }
  @Get('expenses') list(@CurrentUser() user: AuthenticatedUser, @Query() query: PageQueryDto) {
    return this.expenses.list(user.id, query.page);
  }
  @Get('expenses/:id') findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.findOne(user.id, id);
  }
  @Post('expenses') create(@CurrentUser() user: AuthenticatedUser, @Body() input: SaveExpenseDto) {
    return this.expenses.create(user.id, user.sessionId, input);
  }
  @Put('expenses/:id') update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SaveExpenseDto,
  ) {
    return this.expenses.update(user.id, user.sessionId, id, input);
  }
  // Keep method decorators vertically aligned for readability.
  // prettier-ignore
  @Delete('expenses/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.expenses.remove(user.id, user.sessionId, id);
  }
}
