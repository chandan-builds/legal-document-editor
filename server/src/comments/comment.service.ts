import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateCommentDto, ReplyCommentDto } from './dto';
import { CollaboratorRole, AuditAction } from '@prisma/client';
import { AuditService } from '../audit';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a comment on a document (optionally on a specific clause)
   */
  async create(documentId: string, dto: CreateCommentDto, userId: string) {
    await this.ensureAccess(documentId, userId, true);

    const comment = await this.prisma.comment.create({
      data: {
        documentId,
        authorId: userId,
        clauseId: dto.clauseId || null,
        text: dto.text,
        quotedText: dto.quotedText || null,
        positionFrom: dto.positionFrom ?? null,
        positionTo: dto.positionTo ?? null,
      },
      include: {
        author: { select: { id: true, displayName: true, role: true } },
      },
    });

    this.logger.log(`Comment created on doc ${documentId} by ${userId}`);

    // Audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId,
      userId,
      userRole: user!.role,
      action: AuditAction.COMMENT_ADDED,
      entityType: 'Comment',
      entityId: comment.id,
      newValue: { text: dto.text, quotedText: dto.quotedText },
    });

    return comment;
  }

  /**
   * List all comments for a document
   */
  async findByDocument(documentId: string, userId: string) {
    await this.ensureAccess(documentId, userId);

    return this.prisma.comment.findMany({
      where: { documentId, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, role: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true, role: true } },
          },
        },
      },
    });
  }

  /**
   * Toggle comment resolved status
   */
  async resolve(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.ensureAccess(comment.documentId, userId, true);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved: !comment.isResolved,
        resolvedBy: !comment.isResolved ? userId : null,
        resolvedAt: !comment.isResolved ? new Date() : null,
      },
      include: {
        author: { select: { id: true, displayName: true, role: true } },
      },
    });

    // Audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId: comment.documentId,
      userId,
      userRole: user!.role,
      action: AuditAction.COMMENT_RESOLVED,
      entityType: 'Comment',
      entityId: commentId,
    });

    return updated;
  }

  /**
   * Delete a comment
   */
  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.ensureAccess(comment.documentId, userId, true);

    await this.prisma.comment.delete({ where: { id: commentId } });

    // Audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId: comment.documentId,
      userId,
      userRole: user!.role,
      action: AuditAction.COMMENT_DELETED,
      entityType: 'Comment',
      entityId: commentId,
    });

    this.logger.log(`Comment ${commentId} deleted by ${userId}`);
    return { deleted: true };
  }

  /**
   * Reply to an existing comment
   */
  async reply(commentId: string, dto: ReplyCommentDto, userId: string) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!parent) throw new NotFoundException('Comment not found');

    await this.ensureAccess(parent.documentId, userId, true);

    const reply = await this.prisma.comment.create({
      data: {
        documentId: parent.documentId,
        clauseId: parent.clauseId,
        authorId: userId,
        text: dto.text,
        parentId: commentId,
      },
      include: {
        author: { select: { id: true, displayName: true, role: true } },
      },
    });

    this.logger.log(`Reply added to comment ${commentId} by ${userId}`);
    return reply;
  }

  // ── Helpers ──────────────────────────────────────────────

  private async ensureAccess(
    documentId: string,
    userId: string,
    checkFinalized = false,
  ) {
    const collaborator = await this.prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });
    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this document');
    }

    if (checkFinalized) {
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { status: true },
      });
      if (doc?.status === 'FINALIZED') {
        throw new BadRequestException(
          'Cannot modify comments on a finalized document',
        );
      }
    }
  }
}
