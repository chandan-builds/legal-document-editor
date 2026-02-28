import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddCollaboratorDto,
  CreateSectionDto,
} from './dto';
import { CollaboratorRole, DocumentStatus, AuditAction } from '@prisma/client';
import { AuditService } from '../audit';
import { disconnectWsUser } from '../yjs.gateway';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── DOCX → structured Section/Clause parser ──────────────────────
  private parseHtmlToSections(
    html: string,
  ): { title: string; clauses: string[] }[] {
    const sections: { title: string; clauses: string[] }[] = [];
    // Split by heading tags (h1, h2, h3) — each heading starts a new section
    const parts = html.split(/(?=<h[123][^>]*>)/i);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Extract heading text and truncate to max 500 characters for the DB column
      const maxTitleLength = 490; // leave a little room
      const headingMatch = trimmed.match(/<h[123][^>]*>(.*?)<\/h[123]>/i);
      let title = headingMatch
        ? headingMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'General';
      if (title.length > maxTitleLength) {
        title = title.substring(0, maxTitleLength) + '...';
      }

      // Extract clause content (everything after the heading, split by paragraphs/tables)
      const bodyContent = headingMatch
        ? trimmed
            .slice(
              trimmed.indexOf('</h') +
                trimmed.slice(trimmed.indexOf('</h')).indexOf('>') +
                1,
            )
            .trim()
        : trimmed;

      // Split body into individual clauses by <p>, <table>, <blockquote>, <ul>, <ol>
      const clauseBlocks = bodyContent
        .split(/(?=<(?:p|table|blockquote|ul|ol)[^>]*>)/i)
        .map((b) => b.trim())
        .filter((b) => {
          // Filter out empty or whitespace-only blocks
          const textOnly = b.replace(/<[^>]+>/g, '').trim();
          return textOnly.length > 0;
        });

      if (clauseBlocks.length > 0) {
        sections.push({ title, clauses: clauseBlocks });
      } else if (headingMatch) {
        // Section with just a heading and no content
        sections.push({ title, clauses: [] });
      }
    }

    // If no sections were detected (no headings), wrap everything as a single section
    if (sections.length === 0 && html.trim().length > 0) {
      const clauseBlocks = html
        .split(/(?=<(?:p|table|blockquote|ul|ol)[^>]*>)/i)
        .map((b) => b.trim())
        .filter((b) => b.replace(/<[^>]+>/g, '').trim().length > 0);
      sections.push({ title: 'Main Content', clauses: clauseBlocks });
    }

    return sections;
  }

  // ── Sanitize HTML (strip dangerous tags/attributes) ──────────────
  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

  /**
   * Create a new document with optional DOCX upload.
   * DOCX files are decomposed into Section → Clause records.
   * An initial Version snapshot is auto-created for uploads.
   */
  async create(
    dto: CreateDocumentDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    try {
      let initialContent = '';
      const metadata: Record<string, any> = dto.metadata || {};

      // ── Validate upload ──────────────────────────────────────────
      if (file) {
        // We temporarily removed the explicit CLIENT-only check to allow any user to upload documents for testing
        // If strict enforcement is needed later, un-comment this or adapt to the final schema
        // if (uploader?.role !== 'CLIENT') {
        //     throw new ForbiddenException('Only CLIENT users can upload documents.');
        // }

        // File size check
        if (file.size > DocumentService.MAX_FILE_SIZE) {
          throw new BadRequestException(
            `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`,
          );
        }

        try {
          const mammoth = require('mammoth');
          const result = await mammoth.convertToHtml({ buffer: file.buffer });
          initialContent = this.sanitizeHtml(result.value);
          metadata.initialContent = initialContent;
          metadata.originalFileName = file.originalname;
          metadata.originalFileSize = file.size;
          metadata.uploadedAt = new Date().toISOString();
        } catch (error: any) {
          this.logger.error(
            `Failed to parse DOCX file: ${error.message}`,
            error.stack,
          );
        }
      }

      // ── Resolve title ────────────────────────────────────────────
      let finalTitle = 'Untitled Document';
      if (dto.title && dto.title.trim() !== '') {
        finalTitle = dto.title.trim();
      } else if (file && file.originalname) {
        finalTitle =
          file.originalname
            .split(/[/\\]/)
            .pop()
            ?.replace(/\.docx?$/i, '') || 'Untitled Document';
      }

      // ── Create document record ───────────────────────────────────
      const document = await this.prisma.document.create({
        data: {
          title: finalTitle,
          ownerId: userId,
          metadata: metadata,
          collaborators: {
            create: {
              userId,
              role: CollaboratorRole.OWNER,
              accessMode: 'EDIT',
              acceptedAt: new Date(),
            },
          },
        },
        include: {
          owner: {
            select: { id: true, displayName: true, email: true, role: true },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Document created: "${document.title}" by ${userId}`);

      // ── Decompose HTML → Section → Clause records ────────────────
      if (initialContent) {
        const parsed = this.parseHtmlToSections(initialContent);

        for (let i = 0; i < parsed.length; i++) {
          const section = parsed[i];
          const sectionRecord = await this.prisma.section.create({
            data: {
              documentId: document.id,
              title: section.title,
              orderIndex: i,
            },
          });

          for (let j = 0; j < section.clauses.length; j++) {
            await this.prisma.clause.create({
              data: {
                documentId: document.id,
                sectionId: sectionRecord.id,
                contentJson: { html: section.clauses[j] },
                orderIndex: j,
                createdBy: userId,
              },
            });
          }
        }

        this.logger.log(
          `Decomposed DOCX into ${parsed.length} sections for doc ${document.id}`,
        );

        // ── Create initial Version snapshot ──────────────────────
        try {
          const snapshotBuffer = zlib.gzipSync(
            Buffer.from(initialContent, 'utf-8'),
          );
          const contentHash = crypto
            .createHash('sha256')
            .update(snapshotBuffer)
            .digest('hex');

          await this.prisma.documentVersion.create({
            data: {
              documentId: document.id,
              versionNumber: 1,
              snapshot: snapshotBuffer,
              contentHash,
              description: 'Initial upload',
              authorId: userId,
              isMajor: true,
            },
          });

          this.logger.log(`Initial version created for doc ${document.id}`);
        } catch (versionError: any) {
          this.logger.error(
            `Failed to create initial version: ${versionError.message}`,
          );
        }
      }

      // ── Audit log ────────────────────────────────────────────────
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      await this.auditService.log({
        documentId: document.id,
        userId,
        userRole: user!.role,
        action: initialContent
          ? AuditAction.DOCUMENT_UPLOADED
          : AuditAction.DOCUMENT_CREATED,
        newValue: {
          title: document.title,
          hasInitialContent: !!initialContent,
          ...(file && {
            originalFileName: file.originalname,
            fileSizeBytes: file.size,
          }),
        },
      });

      return document;
    } catch (e: any) {
      this.logger.error('Create document failed: ' + e.stack);
      throw new BadRequestException(
        'DEBUG_ERROR: ' + e.message + '\n' + e.stack,
      );
    }
  }

  /**
   * List documents the user has access to
   */
  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: {
        collaborators: { some: { userId } },
      },
      include: {
        owner: { select: { id: true, displayName: true, role: true } },
        collaborators: {
          include: {
            user: { select: { id: true, displayName: true, role: true } },
          },
        },
        _count: { select: { clauses: true, sections: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single document with full details (sections, clauses)
   */
  async findOne(documentId: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: {
          select: { id: true, displayName: true, email: true, role: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, displayName: true, email: true, role: true },
            },
          },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            clauses: {
              orderBy: { orderIndex: 'asc' },
              include: {
                creator: {
                  select: { id: true, displayName: true, role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access
    const hasAccess = document.collaborators.some((c) => c.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  /**
   * Update document metadata/title/status
   */
  async update(documentId: string, dto: UpdateDocumentDto, userId: string) {
    await this.ensureAccess(documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.status && { status: dto.status }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
    });
  }

  /**
   * Add a collaborator to a document
   */
  async addCollaborator(
    documentId: string,
    dto: AddCollaboratorDto,
    inviterId: string,
  ) {
    await this.ensureAccess(documentId, inviterId, [CollaboratorRole.OWNER]);

    // Check for duplicate share
    const existing = await this.prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId: dto.userId } },
    });
    if (existing) {
      throw new BadRequestException(
        'User is already a collaborator on this document',
      );
    }

    const collaborator = await this.prisma.documentCollaborator.create({
      data: {
        documentId,
        userId: dto.userId,
        role: dto.role || CollaboratorRole.EDITOR,
        accessMode: dto.accessMode || 'EDIT',
        invitedBy: inviterId,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, role: true },
        },
      },
    });

    // Audit Log for Sharing / Joining
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId,
      userId: inviterId,
      userRole: inviter!.role,
      action: AuditAction.USER_JOINED,
      entityType: 'User',
      entityId: dto.userId,
      newValue: { role: dto.role || CollaboratorRole.EDITOR },
    });

    this.logger.log(`Collaborator added: ${dto.userId} → doc ${documentId}`);
    return collaborator;
  }

  /**
   * Remove a collaborator from a document
   */
  async removeCollaborator(
    documentId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    await this.ensureAccess(documentId, requesterId, [CollaboratorRole.OWNER]);

    // Cannot remove self (owner)
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (doc?.ownerId === targetUserId) {
      throw new BadRequestException('Cannot remove the document owner');
    }

    await this.prisma.documentCollaborator.delete({
      where: { documentId_userId: { documentId, userId: targetUserId } },
    });

    // Audit log
    const user = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId,
      userId: requesterId,
      userRole: user!.role,
      action: AuditAction.USER_LEFT,
      entityType: 'User',
      entityId: targetUserId,
    });

    // Disconnect their WebSocket if they are currently online
    disconnectWsUser(documentId, targetUserId);

    return { removed: true };
  }

  /**
   * Create a section within a document
   */
  async createSection(
    documentId: string,
    dto: CreateSectionDto,
    userId: string,
  ) {
    await this.ensureAccess(documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    // Auto-assign order index if not provided
    const orderIndex =
      dto.orderIndex ?? (await this.getNextSectionOrder(documentId));

    return this.prisma.section.create({
      data: {
        documentId,
        title: dto.title,
        orderIndex,
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private async ensureAccess(
    documentId: string,
    userId: string,
    allowedRoles: CollaboratorRole[],
  ) {
    const collaborator = await this.prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });

    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this document');
    }

    if (!allowedRoles.includes(collaborator.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`,
      );
    }
  }

  private async getNextSectionOrder(documentId: string): Promise<number> {
    const last = await this.prisma.section.findFirst({
      where: { documentId },
      orderBy: { orderIndex: 'desc' },
    });
    return (last?.orderIndex ?? -1) + 1;
  }
}
