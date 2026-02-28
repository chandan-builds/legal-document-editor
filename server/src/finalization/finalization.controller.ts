import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinalizationService } from './finalization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentAccessGuard } from '../auth/guards';

@Controller('documents/:documentId/finalization')
@UseGuards(JwtAuthGuard, DocumentAccessGuard)
export class FinalizationController {
  constructor(private readonly finalizationService: FinalizationService) {}

  @Get('readiness')
  async checkReadiness(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.finalizationService.checkReadiness(documentId, req.user.userId);
  }

  @Post('finalize')
  async finalize(@Param('documentId') documentId: string, @Request() req: any) {
    return this.finalizationService.finalizeDocument(
      documentId,
      req.user.userId,
    );
  }
}
