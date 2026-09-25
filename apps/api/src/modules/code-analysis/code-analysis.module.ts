import { Module } from '@nestjs/common';
import { CodeAnalysisService } from './code-analysis.service';

@Module({
  providers: [CodeAnalysisService],
  exports: [CodeAnalysisService],
})
export class CodeAnalysisModule {}
