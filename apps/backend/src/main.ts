import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup prefix context for neat router matching (e.g. /api/tenders)
  app.setGlobalPrefix('api');

  // Enforce standard DTO typing validations
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  // Configure CORS handles for client dashboard connections
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 TenderLens Backend API operational at: http://localhost:${port}/api`);
}
bootstrap();
