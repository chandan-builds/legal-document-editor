import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentAccessGuard } from '../auth/guards';
import { RequireMode } from '../auth/decorators/require-mode.decorator';
import {
  CreateSuggestionDto,
  BatchCreateSuggestionsDto,
  ReviewSuggestionDto,
  BatchReviewSuggestionsDto,
} from './dto';

@Controller()
@UseGuards(JwtAuthGuard, DocumentAccessGuard)
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Post('documents/:documentId/suggestions')
  @RequireMode('SUGGEST', 'EDIT')
  async create(
    @Param('documentId') documentId: string,
    @Body() dto: CreateSuggestionDto,
    @Request() req: any,
  ) {
    return this.suggestionService.create(documentId, dto, req.user.userId);
  }

  @Post('documents/:documentId/suggestions/batch')
  @RequireMode('SUGGEST', 'EDIT')
  async createBatch(
    @Param('documentId') documentId: string,
    @Body() dto: BatchCreateSuggestionsDto,
    @Request() req: any,
  ) {
    return this.suggestionService.createBatch(
      documentId,
      dto.suggestions,
      req.user.userId,
    );
  }

  @Get('documents/:documentId/suggestions')
  async findPendingByDocument(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.suggestionService.findPendingByDocument(
      documentId,
      req.user.userId,
    );
  }

  @Post('documents/:documentId/suggestions/:id/review')
  @RequireMode('EDIT')
  async review(
    @Param('documentId') documentId: string,
    @Param('id') id: string,
    @Body() dto: ReviewSuggestionDto,
    @Request() req: any,
  ) {
    return this.suggestionService.review(id, dto, req.user.userId);
  }

  @Post('documents/:documentId/suggestions/:id/view')
  async markViewed(
    @Param('documentId') documentId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.suggestionService.markViewed(id, req.user.userId);
  }

  @Post('documents/:documentId/suggestions/review-batch')
  async reviewBatch(
    @Param('documentId') documentId: string,
    @Body() dto: BatchReviewSuggestionsDto,
    @Request() req: any,
  ) {
    return this.suggestionService.reviewBatch(documentId, dto, req.user.userId);
  }
}
