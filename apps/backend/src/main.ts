import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001')
    .split(',')
    .map(s => s.trim());

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('SinyalTender API')
    .setDescription('Multi-tenant procurement intelligence platform for Indonesian government tenders (LPSE)')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & multi-tenant registration')
    .addTag('tenders', 'LPSE tender listings, search, and AI summaries')
    .addTag('alerts', 'Keyword-based alert engine')
    .addTag('billing', 'Subscription & Midtrans payment integration')
    .addTag('notifications', 'Telegram & email notification dispatch')
    .addTag('dashboard', 'Dashboard statistics aggregation')
    .addTag('admin', 'Superadmin platform management')
    .addTag('scraper', 'LPSE crawler engine & monitoring')
    .addTag('competitor', 'Competitor win history analytics')
    .addTag('health', 'Platform health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 SinyalTender Backend API operational at: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation at: http://localhost:${port}/api/docs`);
}
bootstrap();
