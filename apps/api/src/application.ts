import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestBoundaryMiddleware } from './common/http/request-boundary.js';
import { requestContextMiddleware } from './common/http/request-context.js';
import { ResponseSerializationInterceptor } from './common/serialization/response-serialization.interceptor.js';
import { createValidationPipe } from './common/validation/validation-pipe.js';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  app.use(requestContextMiddleware);
  app.use(requestBoundaryMiddleware(webOrigin));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseSerializationInterceptor());
  app.enableCors({
    credentials: true,
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => callback(null, origin === undefined || origin === webOrigin),
  });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
