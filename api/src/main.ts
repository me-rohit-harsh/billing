import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const uploadDir = path.join(process.cwd(), 'storage', 'uploads', 'products');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule);
  
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '*';
  const allowedOrigins = allowedOriginsEnv === '*'
    ? true
    : allowedOriginsEnv.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 5005;
  await app.listen(port);
  console.log(`🚀 Billing API Server running on port ${port}`);
}
bootstrap();
