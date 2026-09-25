import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { SystemClock } from '../calendar/clock.js';
import { isFinancialDate } from '../calendar/calendar.js';
import { isDecimalStringInRange, type DecimalLimits } from './decimal.js';

export function IsFinancialDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isFinancialDate',
      target: target.constructor,
      propertyName: String(propertyKey),
      options,
      validator: { validate: (value: unknown) => isFinancialDate(value, new SystemClock()) },
    });
}

export function IsDomainDecimal(
  limits: DecimalLimits,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isDomainDecimal',
      target: target.constructor,
      propertyName: String(propertyKey),
      constraints: [limits],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) =>
          isDecimalStringInRange(value, args.constraints[0] as DecimalLimits),
      },
    });
}
