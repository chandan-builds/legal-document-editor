import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateClauseDto, UpdateClauseDto } from './dto';
import { CollaboratorRole, ClauseStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ClauseService {
  private readonly logger = new Logger(ClauseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a clause within a section
   */
  async create(documentId: string, dto: CreateClauseDto, userId: string) {
    await this.ensureDocAccess(documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    // Verify section belongs to this document
    const section = await this.prisma.section.findFirst({
      where: { id: dto.sectionId, documentId },
    });
    if (!section) {
      throw new NotFoundException(
        'Section not found or does not belong to this document',
      );
    }

    const orderIndex =
      dto.orderIndex ?? (await this.getNextClauseOrder(dto.sectionId));
    const contentHash = this.hashContent(dto.contentJson);

    const clause = await this.prisma.clause.create({
      data: {
        sectionId: dto.sectionId,
        documentId,
        title: dto.title,
        contentJson: dto.contentJson,
        orderIndex,
        originalHash: contentHash,
        currentHash: contentHash,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, displayName: true, role: true } },
      },
    });

    this.logger.log(
      `Clause created: "${clause.title || clause.id}" in doc ${documentId}`,
    );
    return clause;
  }

  /**
   * List all clauses for a document, grouped by section
   */
  async findAllByDocument(documentId: string, userId: string) {
    await this.ensureDocAccess(documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
      CollaboratorRole.REVIEWER,
      CollaboratorRole.VIEWER,
    ]);

    return this.prisma.section.findMany({
      where: { documentId },
      orderBy: { orderIndex: 'asc' },
      include: {
        clauses: {
          orderBy: { orderIndex: 'asc' },
          include: {
            creator: { select: { id: true, displayName: true, role: true } },
            _count: {
              select: {
                comments: true,
                editSuggestions: true,
                approvals: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get a single clause with full details
   */
  async findOne(clauseId: string, userId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
      include: {
        section: true,
        creator: { select: { id: true, displayName: true, role: true } },
        locker: { select: { id: true, displayName: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true, role: true } },
            replies: {
              include: {
                author: { select: { id: true, displayName: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!clause) {
      throw new NotFoundException('Clause not found');
    }

    await this.ensureDocAccess(clause.documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
      CollaboratorRole.REVIEWER,
      CollaboratorRole.VIEWER,
    ]);

    return clause;
  }

  /**
   * Update clause content (only if not locked by another user and not finalized)
   */
  async update(clauseId: string, dto: UpdateClauseDto, userId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
    });

    if (!clause) {
      throw new NotFoundException('Clause not found');
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: clause.documentId },
      select: { status: true },
    });
    if (doc?.status === 'FINALIZED') {
      throw new BadRequestException(
        'Cannot edit clauses in a finalized document',
      );
    }

    // Check access
    await this.ensureDocAccess(clause.documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    // Check if locked by another user
    if (clause.isLocked && clause.lockedBy !== userId) {
      throw new ForbiddenException('Clause is locked by another user');
    }

    // Cannot edit finalized clauses
    if (clause.status === ClauseStatus.MUTUALLY_APPROVED) {
      throw new BadRequestException('Cannot edit a mutually approved clause');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.contentJson !== undefined) {
      updateData.contentJson = dto.contentJson;
      updateData.currentHash = this.hashContent(dto.contentJson);
    }

    return this.prisma.clause.update({
      where: { id: clauseId },
      data: updateData,
      include: {
        creator: { select: { id: true, displayName: true, role: true } },
      },
    });
  }

  /**
   * Lock a clause for exclusive editing
   */
  async lock(clauseId: string, userId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
    });
    if (!clause) throw new NotFoundException('Clause not found');

    if (clause.isLocked && clause.lockedBy !== userId) {
      throw new ForbiddenException('Clause is already locked by another user');
    }

    return this.prisma.clause.update({
      where: { id: clauseId },
      data: { isLocked: true, lockedBy: userId, lockedAt: new Date() },
    });
  }

  /**
   * Unlock a clause
   */
  async unlock(clauseId: string, userId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
    });
    if (!clause) throw new NotFoundException('Clause not found');

    // Only the locker or an owner can unlock
    if (clause.lockedBy !== userId) {
      await this.ensureDocAccess(clause.documentId, userId, [
        CollaboratorRole.OWNER,
      ]);
    }

    return this.prisma.clause.update({
      where: { id: clauseId },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private async ensureDocAccess(
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

  private async getNextClauseOrder(sectionId: string): Promise<number> {
    const last = await this.prisma.clause.findFirst({
      where: { sectionId },
      orderBy: { orderIndex: 'desc' },
    });
    return (last?.orderIndex ?? -1) + 1;
  }

  private hashContent(content: any): string {
    const json = JSON.stringify(content);
    return crypto.createHash('sha256').update(json).digest('hex');
  }
}
