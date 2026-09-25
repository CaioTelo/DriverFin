import type { Request } from 'express';

export const REFRESH_COOKIE_NAME = 'driverfin_refresh';

export function readRefreshCookie(request: Request): string | undefined {
  const header = request.header('Cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== REFRESH_COOKIE_NAME) continue;
    return part.slice(separator + 1).trim() || undefined;
  }
  return undefined;
}
