import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PageQueryDto {
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;
}
