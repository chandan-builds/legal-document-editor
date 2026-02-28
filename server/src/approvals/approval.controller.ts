import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClauseActionDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post('clauses/:id/action')
  async processAction(
    @Param('id') clauseId: string,
    @Body() dto: ClauseActionDto,
    @Request() req: any,
  ) {
    return this.approvalService.processAction(clauseId, dto, req.user.userId);
  }

  @Get('documents/:documentId/approval-status')
  async getDocumentApprovalStatus(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.approvalService.getDocumentApprovalStatus(
      documentId,
      req.user.userId,
    );
  }
}
