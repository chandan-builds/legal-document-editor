import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  UseGuards,
  Request,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { OnlyOfficeService } from './onlyoffice.service';
import { FileStorageService } from '../file-storage';
import { PrismaService } from '../prisma';
import { AuditService } from '../audit';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnlyOfficeCallbackDto } from './dto';
import { AuditAction } from '@prisma/client';

@Controller('onlyoffice')
export class OnlyOfficeController {
  private readonly logger = new Logger(OnlyOfficeController.name);

  constructor(
    private readonly onlyOfficeService: OnlyOfficeService,
    private readonly fileStorageService: FileStorageService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /onlyoffice/config/:docId
   * Returns the OnlyOffice editor configuration JSON for the frontend to initialize the editor.
   */
  @Get('config/:docId')
  @UseGuards(JwtAuthGuard)
  async getEditorConfig(@Param('docId') docId: string, @Request() req: any) {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Ensure the file exists on disk
    if (!this.fileStorageService.fileExists(docId)) {
      throw new NotFoundException(
        'Document file not found on disk. Please re-upload the document.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, displayName: true, role: true },
    });

    const config = await this.onlyOfficeService.buildEditorConfig(
      docId,
      req.user.userId,
      user?.displayName || 'Unknown User',
      user?.role || 'CLIENT',
    );

    // Also return the OnlyOffice API script URL for the frontend
    return {
      ...config,
      apiScriptUrl: this.onlyOfficeService.getApiScriptUrl(),
    };
  }

  /**
   * GET /onlyoffice/files/:docId
   * Serves the current DOCX file to OnlyOffice Document Server.
   * This endpoint is called by OnlyOffice (from inside Docker) to download the document.
   * No auth guard — OnlyOffice doesn't send JWT tokens.
   */
  @Get('files/:docId')
  async serveFile(@Param('docId') docId: string, @Res() res: Response) {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      select: { fileName: true },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (!this.fileStorageService.fileExists(docId)) {
      throw new NotFoundException('Document file not found on disk');
    }

    const filePath = this.fileStorageService.getDocumentPath(docId);
    const fileName = doc.fileName || 'document.docx';

    // Send file using res.download to automatically provide Content-Length and handle headers
    res.download(filePath, fileName, (err) => {
      if (err) {
        this.logger.error(`Error sending file ${fileName}:`, err);
      }
    });
  }

  /**
   * POST /onlyoffice/callback
   * Receives save/close events from OnlyOffice Document Server.
   * No auth guard — OnlyOffice sends this callback from inside Docker.
   *
   * Status codes:
   *   1 = document being edited (no action)
   *   2 = document ready for saving (all users closed)
   *   4 = document closed with no changes (no action)
   *   6 = force save triggered
   *
   * CRITICAL: Must always return { "error": 0 }
   */
  @Post('callback')
  @HttpCode(200)
  async handleCallback(@Body() body: OnlyOfficeCallbackDto) {
    this.logger.log(
      `OnlyOffice callback received: status=${body.status}, key=${body.key}`,
    );

    try {
      // Status 2 = save after close, Status 6 = force save
      if ((body.status === 2 || body.status === 6) && body.url && body.key) {
        await this.processSaveCallback(body);
      } else {
        this.logger.log(
          `Callback status ${body.status} — no save action needed`,
        );
      }
    } catch (error) {
      // Log error but still return { error: 0 } to OnlyOffice
      this.logger.error(
        `Error processing callback: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    // OnlyOffice REQUIRES this exact response format
    return { error: 0 };
  }

  /**
   * Process a save callback (status 2 or 6):
   *  1. Parse docId from key
   *  2. Download updated DOCX from OnlyOffice's temporary URL
   *  3. Snapshot current.docx into versions/
   *  4. Overwrite current.docx with new content
   *  5. Create DocumentVersion DB record
   *  6. Increment document.currentVersion
   */
  private async processSaveCallback(body: OnlyOfficeCallbackDto) {
    const docId = this.onlyOfficeService.parseDocIdFromKey(body.key!);
    if (!docId) {
      throw new BadRequestException(
        `Could not parse document ID from key: ${body.key}`,
      );
    }

    this.logger.log(`Processing save for document ${docId}`);

    // Get the document from DB
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      select: { id: true, currentVersion: true },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${docId} not found`);
    }

    // Download updated DOCX from OnlyOffice
    // OnlyOffice returns a URL with the container's internal hostname.
    // Replace it with localhost:8080 so the backend (on host) can reach it.
    let downloadUrl = body.url!;
    // Replace common internal Docker hostnames with localhost
    downloadUrl = downloadUrl
      .replace(/http:\/\/onlyoffice-local(:\d+)?/g, 'http://localhost:8080')
      .replace(/http:\/\/onlyoffice(:\d+)?/g, 'http://localhost:8080')
      .replace(/http:\/\/[a-f0-9]+:80\b/g, 'http://localhost:8080');

    this.logger.log(`Downloading updated file from: ${downloadUrl}`);

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download file from OnlyOffice: ${response.status} ${response.statusText}`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    this.logger.log(`Downloaded ${buffer.length} bytes`);

    // Snapshot current file before overwriting
    const versionPath = await this.fileStorageService.createVersionSnapshot(
      docId,
      doc.currentVersion,
    );

    // Overwrite current.docx
    await this.fileStorageService.overwriteCurrent(docId, buffer);

    // Compute content hash of new file
    const contentHash = this.fileStorageService.getFileHash(
      this.fileStorageService.getDocumentPath(docId),
    );

    // Get the user who triggered the save (from callback actions or users array)
    const userId = body.actions?.[0]?.userid || body.users?.[0] || 'system';

    // Get previous version hash for chain integrity
    const prevVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: docId },
      orderBy: { versionNumber: 'desc' },
      select: { contentHash: true },
    });

    // Create DocumentVersion record
    await this.prisma.documentVersion.create({
      data: {
        documentId: docId,
        versionNumber: doc.currentVersion,
        versionPath: versionPath,
        contentHash: contentHash,
        prevHash: prevVersion?.contentHash || null,
        description: `Version ${doc.currentVersion}`,
        authorId: userId,
        isMajor: true,
      },
    });

    // Increment document version
    await this.prisma.document.update({
      where: { id: docId },
      data: {
        currentVersion: { increment: 1 },
        contentHash: contentHash,
      },
    });

    this.logger.log(
      `Save complete: doc ${docId}, version ${doc.currentVersion} → ${doc.currentVersion + 1}`,
    );

    // Audit log
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user) {
        await this.auditService.log({
          documentId: docId,
          userId: userId,
          userRole: user.role,
          action: AuditAction.VERSION_CREATED,
          entityType: 'DocumentVersion',
          newValue: {
            versionNumber: doc.currentVersion,
            source: 'onlyoffice',
          },
        });
      }
    } catch (auditError) {
      this.logger.warn(
        `Audit log failed (non-critical): ${(auditError as Error).message}`,
      );
    }
  }
}
