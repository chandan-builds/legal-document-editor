import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3001',
  );

  // Global validation pipe — validates DTOs with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Compression for responses > 1KB
  app.use(compression({ threshold: 1024 }));

  // Parse cookies
  app.use(cookieParser());

  // WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`CORS origin: ${corsOrigin}`);
}

bootstrap();
