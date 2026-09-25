import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

@Module({
  imports: [ConfigModule],
  controllers: [DocumentationController],
  providers: [DocumentationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
