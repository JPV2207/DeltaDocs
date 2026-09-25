import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DOC_GENERATION_QUEUE } from './queue.constants';
import { DocGenerationProcessor } from './doc-generation.processor';
import { GithubModule } from '../github/github.module';
import { CodeAnalysisModule } from '../code-analysis/code-analysis.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl && redisUrl.startsWith('redis://')) {
          // Parse url
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port) || 6379,
              password: url.password || undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: DOC_GENERATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
    GithubModule,
    CodeAnalysisModule,
    LlmModule,
  ],
  providers: [DocGenerationProcessor],
  exports: [BullModule],
})
export class QueueModule {}
