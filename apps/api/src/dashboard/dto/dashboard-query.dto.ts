import { IsIn, IsOptional } from 'class-validator';
import type { DashboardPeriod } from '../../common/calendar/calendar.js';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month'])
  period: DashboardPeriod = 'month';
}
