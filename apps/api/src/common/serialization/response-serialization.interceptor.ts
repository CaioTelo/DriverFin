import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { map, type Observable } from 'rxjs';
import type { Response } from 'express';

@Injectable()
export class ResponseSerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'private, no-store');
    return next.handle().pipe(map((value) => serializeValue(value)));
  }
}

function serializeValue(value: unknown, key?: string): unknown {
  if (Prisma.Decimal.isDecimal(value)) return value.toFixed(2);
  if (value instanceof Date)
    return key === 'date' ? value.toISOString().slice(0, 10) : value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        serializeValue(entryValue, entryKey),
      ]),
    );
  }
  return value;
}
