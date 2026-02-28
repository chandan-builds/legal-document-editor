import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClauseService } from './clause.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateClauseDto, UpdateClauseDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ClauseController {
  constructor(private readonly clauseService: ClauseService) {}

  @Post('documents/:documentId/clauses')
  async create(
    @Param('documentId') documentId: string,
    @Body() dto: CreateClauseDto,
    @Request() req: any,
  ) {
    return this.clauseService.create(documentId, dto, req.user.userId);
  }

  @Get('documents/:documentId/clauses')
  async findAllByDocument(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.clauseService.findAllByDocument(documentId, req.user.userId);
  }

  @Get('clauses/:id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.clauseService.findOne(id, req.user.userId);
  }

  @Patch('clauses/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClauseDto,
    @Request() req: any,
  ) {
    return this.clauseService.update(id, dto, req.user.userId);
  }

  @Post('clauses/:id/lock')
  async lock(@Param('id') id: string, @Request() req: any) {
    return this.clauseService.lock(id, req.user.userId);
  }

  @Post('clauses/:id/unlock')
  async unlock(@Param('id') id: string, @Request() req: any) {
    return this.clauseService.unlock(id, req.user.userId);
  }
}
