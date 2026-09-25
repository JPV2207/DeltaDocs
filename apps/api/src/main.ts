import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Enable rawBody in NestJS options to capture buffer for webhook HMAC checking
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Enable CORS for frontend consumption
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Configure Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('AutoDocs API')
    .setDescription('Automated documentation generation and git commit versioning engine')
    .setVersion('1.0.0')
    .addTag('Webhooks', 'GitHub push and ping webhook handling')
    .addTag('Documentation', 'Documentation reading, history, and version snapshots')
    .addTag('Admin', 'Manual generation triggers, queue monitoring, and retry operations')
    .addTag('System', 'Health and diagnostics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs-api', app, document);

  await app.listen(port);
  logger.log(`🚀 AutoDocs API running on http://localhost:${port}`);
  logger.log(`📖 Swagger API documentation available at http://localhost:${port}/api/docs-api`);
  logger.log(`💓 Health check at http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error('Fatal error starting AutoDocs API:', err);
  process.exit(1);
});
