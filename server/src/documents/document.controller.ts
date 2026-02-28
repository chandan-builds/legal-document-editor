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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddCollaboratorDto,
  CreateSectionDto,
} from './dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateDocumentDto,
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.documentService.create(dto, req.user.userId, file);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.documentService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.documentService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Request() req: any,
  ) {
    return this.documentService.update(id, dto, req.user.userId);
  }

  @Post(':id/collaborators')
  async addCollaborator(
    @Param('id') id: string,
    @Body() dto: AddCollaboratorDto,
    @Request() req: any,
  ) {
    return this.documentService.addCollaborator(id, dto, req.user.userId);
  }

  @Post(':id/sections')
  async createSection(
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
    @Request() req: any,
  ) {
    return this.documentService.createSection(id, dto, req.user.userId);
  }

  @Delete(':id/collaborators/:userId')
  async removeCollaborator(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.documentService.removeCollaborator(id, userId, req.user.userId);
  }
}
