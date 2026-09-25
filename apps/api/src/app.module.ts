import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { GithubModule } from './modules/github/github.module';
import { CodeAnalysisModule } from './modules/code-analysis/code-analysis.module';
import { LlmModule } from './modules/llm/llm.module';
import { QueueModule } from './modules/queue/queue.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { DocumentationModule } from './modules/documentation/documentation.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    PrismaModule,
    GithubModule,
    CodeAnalysisModule,
    LlmModule,
    QueueModule,
    WebhookModule,
    DocumentationModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
