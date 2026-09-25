import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DocumentationService } from './documentation.service';

@ApiTags('Documentation')
@Controller('api/docs')
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest active documentation version' })
  @ApiQuery({ name: 'repository', required: false, description: 'Repository name (e.g. owner/repo)' })
  @ApiResponse({ status: 200, description: 'Latest documentation payload' })
  async getLatest(@Query('repository') repository?: string) {
    return this.documentationService.getLatestDocumentation(repository);
  }

  @Get('versions')
  @ApiOperation({ summary: 'List historical documentation versions' })
  @ApiQuery({ name: 'repository', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated versions list' })
  async getVersions(
    @Query('repository') repository?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    return this.documentationService.getVersions(repository, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('version/:commitSha')
  @ApiOperation({ summary: 'Get documentation version by git commit SHA' })
  @ApiQuery({ name: 'repository', required: false })
  @ApiResponse({ status: 200, description: 'Specific documentation version payload' })
  async getVersion(
    @Param('commitSha') commitSha: string,
    @Query('repository') repository?: string
  ) {
    return this.documentationService.getVersionBySha(commitSha, repository);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get documentation generation statistics' })
  @ApiQuery({ name: 'repository', required: false })
  @ApiResponse({ status: 200, description: 'Metrics and aggregate statistics' })
  async getStats(@Query('repository') repository?: string) {
    return this.documentationService.getStats(repository);
  }
}
