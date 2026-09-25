import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { QueueModule } from '../queue/queue.module';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [ConfigModule, QueueModule, GithubModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
