import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const requestIds = new WeakMap<object, string>();

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  requestIds.set(request, requestId);
  response.setHeader('X-Request-Id', requestId);
  next();
}

export function getRequestId(request: object): string {
  return requestIds.get(request) ?? randomUUID();
}
