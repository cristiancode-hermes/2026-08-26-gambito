import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const dbPath = process.env.DATABASE_PATH || 'data/gambito.db';
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch {
    /* ignore */
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Gambito API')
    .setDescription('Café de juegos — mesas, copias y pase QR')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT || 3075);
  await app.listen(port);
  console.log(`Gambito API running on http://localhost:${port}`);
}

bootstrap();
