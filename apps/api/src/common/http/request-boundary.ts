import { ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requestBoundaryMiddleware(webOrigin: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (READ_METHODS.has(request.method)) {
      next();
      return;
    }

    if (!request.is('application/json')) {
      next(
        new UnsupportedMediaTypeException({
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Envie o conteúdo como JSON.',
        }),
      );
      return;
    }
    if (request.header('X-DriverFin-Client') !== 'web' || request.header('Origin') !== webOrigin) {
      next(
        new ForbiddenException({
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Origem da requisição não permitida.',
        }),
      );
      return;
    }
    next();
  };
}
