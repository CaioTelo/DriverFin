import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';

function collectFields(
  errors: ValidationError[],
  fields: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const error of errors) {
    const messages = Object.values(error.constraints ?? {});
    if (messages.length > 0) fields[error.property] = messages;
    if (error.children?.length) collectFields(error.children, fields);
  }
  return fields;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Revise os campos informados.',
        fields: collectFields(errors),
        writeOutcome: 'not_applied',
      }),
  });
}
