import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = process.env.PORT || configService.get<number>('PORT', 3001);

  const corsOrigin =
    configService.get<string>('CORS_ORIGIN') || '*';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(compression({ threshold: 1024 }));
  app.use(cookieParser());

  app.useWebSocketAdapter(new WsAdapter(app));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://legal-document-editor-nine.vercel.app',
    ],
    credentials: true,
  });

  await app.listen(port);

  logger.log(`Server running on port ${port}`);
  logger.log(`Health check: /health`);
  logger.log(`CORS origin: ${corsOrigin}`);
}

bootstrap();
