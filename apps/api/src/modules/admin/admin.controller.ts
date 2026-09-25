import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ManualGenerateRequestDto } from '@autodocs/shared';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Manually trigger documentation generation (full or incremental)' })
  @ApiResponse({ status: 200, description: 'Job enqueued successfully' })
  async triggerGeneration(@Body() dto: ManualGenerateRequestDto) {
    return this.adminService.triggerGeneration(dto);
  }

  @Get('generations')
  @ApiOperation({ summary: 'List documentation generation audit runs and statuses' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'success', 'failed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of generation audit history' })
  async getGenerations(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50'
  ) {
    return this.adminService.getGenerations(status, parseInt(page, 10), parseInt(limit, 10));
  }

  @Post('generations/:id/retry')
  @ApiOperation({ summary: 'Retry a failed generation job' })
  @ApiResponse({ status: 200, description: 'Job re-enqueued' })
  async retryGeneration(@Param('id') id: string) {
    return this.adminService.retryGeneration(id);
  }
}
