import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VersionService } from './version.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentAccessGuard } from '../auth/guards';
import { CreateVersionDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard, DocumentAccessGuard)
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Post('documents/:docId/versions')
  async create(
    @Param('docId') docId: string,
    @Body() dto: CreateVersionDto,
    @Request() req: any,
  ) {
    return this.versionService.create(docId, dto, req.user.userId);
  }

  @Get('documents/:docId/versions')
  async findAll(@Param('docId') docId: string) {
    return this.versionService.findByDocument(docId);
  }

  @Get('versions/:id/snapshot')
  async getSnapshot(@Param('id') id: string) {
    return this.versionService.getSnapshot(id);
  }

  @Get('documents/:docId/versions/:id/diff')
  async getDiff(
    @Param('docId') docId: string,
    @Param('id') id: string,
    @Query('targetVersionId') targetVersionId?: string,
  ) {
    return this.versionService.getDiff(docId, id, targetVersionId);
  }

  @Post('documents/:docId/restore/:versionId')
  async restoreVersion(
    @Param('docId') docId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ) {
    return this.versionService.restoreVersion(
      docId,
      versionId,
      req.user.userId,
    );
  }

  @Delete('documents/:docId/versions/:versionId')
  async deleteVersion(
    @Param('docId') docId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ) {
    return this.versionService.deleteVersion(docId, versionId, req.user.userId);
  }
}
