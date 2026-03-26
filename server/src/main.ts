import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = process.env.PORT || configService.get<number>('PORT', 3001);

  // ── Security ───────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression({ threshold: 1024 }));
  app.use(cookieParser());

  // ── Validation ─────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://legal-document-editor-nine.vercel.app',
    ],
    credentials: true,
  });

  // NOTE: No WsAdapter — YjsGateway hooks into HTTP upgrade directly

  await app.listen(port);

  logger.log(`Server running on port ${port}`);
  logger.log(`Health check: /health`);
}

bootstrap();
