import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { getRequestId } from '../http/request-context.js';

type WriteOutcome = 'not_applied' | 'unknown';

interface ErrorDetails {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
  writeOutcome?: WriteOutcome;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = this.details(exception);
    const requestId = getRequestId(request);
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const writeOutcome = isWrite
      ? (details.writeOutcome ?? (status >= 500 ? 'unknown' : 'not_applied'))
      : undefined;

    response.setHeader('Cache-Control', 'private, no-store');
    this.logger.log(`${request.method} ${request.path} ${status} requestId=${requestId}`);
    response.status(status).json({
      error: {
        code: details.code ?? this.defaultCode(status),
        message: details.message ?? this.defaultMessage(status),
        ...(details.fields ? { fields: details.fields } : {}),
        requestId,
        ...(writeOutcome ? { writeOutcome } : {}),
      },
    });
  }

  private details(exception: unknown): ErrorDetails {
    if (!(exception instanceof HttpException)) return {};
    const raw = exception.getResponse();
    if (typeof raw === 'string') return { message: raw };
    if (!raw || typeof raw !== 'object') return {};
    const value = raw as Record<string, unknown>;
    const nested = value.error;
    const source =
      nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : value;
    return {
      code: typeof source.code === 'string' ? source.code : undefined,
      message: typeof source.message === 'string' ? source.message : undefined,
      fields: this.isFields(source.fields) ? source.fields : undefined,
      writeOutcome:
        source.writeOutcome === 'not_applied' || source.writeOutcome === 'unknown'
          ? source.writeOutcome
          : undefined,
    };
  }

  private isFields(value: unknown): value is Record<string, string[]> {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      Object.values(value as object).every(
        (messages) =>
          Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
      )
    );
  }

  private defaultCode(status: number): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 403) return 'ORIGIN_NOT_ALLOWED';
    if (status === 415) return 'UNSUPPORTED_MEDIA_TYPE';
    if (status === 503) return 'SERVICE_UNAVAILABLE';
    return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  }

  private defaultMessage(status: number): string {
    if (status === 400) return 'Revise os campos informados.';
    if (status === 403) return 'Origem da requisição não permitida.';
    if (status === 415) return 'Envie o conteúdo como JSON.';
    if (status === 503) return 'Serviço temporariamente indisponível.';
    return status >= 500
      ? 'Ocorreu uma falha interna.'
      : 'Não foi possível processar a requisição.';
  }
}
