import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(helmet); 
  
  await app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Restrict origin
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

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
