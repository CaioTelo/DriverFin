import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './application.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'), '0.0.0.0');
}

bootstrap().catch(() => {
  console.error('Não foi possível iniciar a API. Verifique a configuração do ambiente.');
  process.exitCode = 1;
});
