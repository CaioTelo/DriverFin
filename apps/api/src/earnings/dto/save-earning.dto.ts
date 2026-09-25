import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { IsDomainDecimal, IsFinancialDate } from '../../common/validation/domain.decorators.js';

export class SaveEarningDto {
  @IsFinancialDate({ message: 'Informe uma data válida até hoje.' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  platformId!: string;

  @IsDomainDecimal(
    { maxIntegerDigits: 63, scale: 2, minimum: '0', minimumExclusive: true },
    { message: 'Informe um valor positivo com até duas casas decimais.' },
  )
  amount!: string;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  rides!: number;

  @IsDomainDecimal(
    { maxIntegerDigits: 2, scale: 2, minimum: '0', maximum: '24' },
    { message: 'Informe horas entre 0 e 24, com até duas casas decimais.' },
  )
  hours!: string;

  @IsDomainDecimal(
    { maxIntegerDigits: 63, scale: 2, minimum: '0' },
    { message: 'Informe quilômetros maiores ou iguais a zero, com até duas casas decimais.' },
  )
  kilometers!: string;
}
