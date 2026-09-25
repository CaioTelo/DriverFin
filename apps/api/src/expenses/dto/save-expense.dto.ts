import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDomainDecimal, IsFinancialDate } from '../../common/validation/domain.decorators.js';

export class SaveExpenseDto {
  @IsFinancialDate({ message: 'Informe uma data válida até hoje.' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsDomainDecimal(
    { maxIntegerDigits: 63, scale: 2, minimum: '0', minimumExclusive: true },
    { message: 'Informe um valor positivo com até duas casas decimais.' },
  )
  amount!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
