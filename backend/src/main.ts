import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

loadEnv({ path: resolve(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule.forRoot());
  const config = app.get(ConfigService);

  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
