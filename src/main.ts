import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { envs } from './config/envs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api'); // Establece el prefijo global "API" para todas las rutas

  // Configurar las pipe de las clases validator y transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.register(helmet);

  await app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000000,
      fields: 10,
      fileSize: 5000000,
      files: 1,
      headerPairs: 2000,
    },
  });

  await app.listen(envs.port, '0.0.0.0');
  console.log(`App running on port ${envs.port}`);
}
bootstrap();
