import { HttpException } from '@nestjs/common';

export class ConfirmedRollbackException extends HttpException {
  constructor() {
    super(
      {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível concluir a operação.',
        writeOutcome: 'not_applied',
      },
      500,
    );
  }
}

export class UnknownWriteOutcomeException extends HttpException {
  constructor() {
    super(
      {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível confirmar a operação.',
        writeOutcome: 'unknown',
      },
      500,
    );
  }
}
