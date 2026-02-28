import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentAccessGuard } from '../auth/guards';

@Controller()
@UseGuards(JwtAuthGuard, DocumentAccessGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('documents/:docId/audit-logs')
  async findAll(
    @Param('docId') docId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findByDocument(
      docId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('documents/:docId/activity')
  async getActivity(
    @Param('docId') docId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findActivityTimeline(
      docId,
      limit ? parseInt(limit, 10) : 50,
      cursor,
    );
  }
}
