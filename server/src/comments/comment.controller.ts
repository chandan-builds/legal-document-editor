import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentAccessGuard } from '../auth/guards';
import { RequireMode } from '../auth/decorators/require-mode.decorator';
import { CreateCommentDto, ReplyCommentDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard, DocumentAccessGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('documents/:docId/comments')
  @RequireMode('COMMENT', 'SUGGEST', 'EDIT')
  async create(
    @Param('docId') docId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.commentService.create(docId, dto, req.user.userId);
  }

  @Get('documents/:docId/comments')
  async findAll(@Param('docId') docId: string, @Request() req: any) {
    return this.commentService.findByDocument(docId, req.user.userId);
  }

  @Patch('documents/:docId/comments/:id/resolve')
  async resolve(
    @Param('docId') docId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.commentService.resolve(id, req.user.userId);
  }

  @Delete('documents/:docId/comments/:id')
  async remove(
    @Param('docId') docId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.commentService.remove(id, req.user.userId);
  }

  @Post('documents/:docId/comments/:id/replies')
  @RequireMode('COMMENT', 'SUGGEST', 'EDIT')
  async reply(
    @Param('docId') docId: string,
    @Param('id') id: string,
    @Body() dto: ReplyCommentDto,
    @Request() req: any,
  ) {
    return this.commentService.reply(id, dto, req.user.userId);
  }
}
