import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateVersionDto } from './dto';
import { CollaboratorRole, AuditAction, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { AuditService } from '../audit';

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new document version snapshot (stored as bytea in PostgreSQL)
   */
  async create(documentId: string, dto: CreateVersionDto, userId: string) {
    await this.ensureAccess(documentId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { currentVersion: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const versionNumber = doc.currentVersion;
    const rawBuffer = Buffer.from(dto.snapshot);
    const snapshotBuffer = zlib.gzipSync(rawBuffer);
    const contentHash = crypto
      .createHash('sha256')
      .update(snapshotBuffer)
      .digest('hex');

    // Get previous version hash for chain integrity
    const prevVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { contentHash: true },
    });

    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        snapshot: snapshotBuffer,
        contentHash,
        prevHash: prevVersion?.contentHash || null,
        description: dto.description || `Version ${versionNumber}`,
        authorId: userId,
        changeSummary: dto.changeSummary || undefined,
        isMajor: true,
      },
      select: {
        id: true,
        versionNumber: true,
        contentHash: true,
        description: true,
        changeSummary: true,
        isMajor: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });

    // Increment the document's current_version
    await this.prisma.document.update({
      where: { id: documentId },
      data: { currentVersion: { increment: 1 } },
    });

    this.logger.log(
      `Version ${versionNumber} created for doc ${documentId} by ${userId}`,
    );

    // Audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    await this.auditService.log({
      documentId,
      userId,
      userRole: user!.role,
      action: AuditAction.VERSION_CREATED,
      entityType: 'DocumentVersion',
      entityId: version.id,
      newValue: { versionNumber, description: version.description },
    });

    return version;
  }

  /**
   * List all version metadata for a document (no binary data)
   */
  async findByDocument(documentId: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        contentHash: true,
        prevHash: true,
        description: true,
        changeSummary: true,
        isMajor: true,
        createdAt: true,
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  /**
   * Get a specific version's binary snapshot
   */
  async getSnapshot(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
      select: {
        snapshot: true,
        contentHash: true,
        documentId: true,
        versionNumber: true,
      },
    });

    if (!version) throw new NotFoundException('Version not found');

    const actualHash = crypto
      .createHash('sha256')
      .update(version.snapshot)
      .digest('hex');
    if (actualHash !== version.contentHash) {
      this.logger.error(
        `INTEGRITY VIOLATION: Version ${versionId} hash mismatch`,
      );
      await this.auditService.log({
        documentId: version.documentId,
        userId: 'system',
        userRole: UserRole.ADMIN,
        action: AuditAction.INTEGRITY_CHECK_FAILED,
        entityType: 'DocumentVersion',
        entityId: versionId,
      });
    }

    const decompressed = zlib.gunzipSync(version.snapshot);

    // Return the snapshot as an array of numbers (JSON-serializable Uint8Array)
    return {
      snapshot: Array.from(decompressed),
      hash: version.contentHash,
      versionNumber: (version as any).versionNumber, // Quick cast if not selected, wait, I didn't select it above! Let's select it.
    };
  }

  /**
   * Get two versions side-by-side for diffing
   */
  async getDiff(
    documentId: string,
    versionId: string,
    targetVersionId?: string,
  ) {
    const base = await this.getSnapshot(versionId);

    let target: any = null;
    if (targetVersionId) {
      target = await this.getSnapshot(targetVersionId);
    } else {
      const baseVersion = await this.prisma.documentVersion.findUnique({
        where: { id: versionId },
        select: { versionNumber: true },
      });
      if (baseVersion && baseVersion.versionNumber > 1) {
        const prev = await this.prisma.documentVersion.findFirst({
          where: {
            documentId,
            versionNumber: { lt: baseVersion.versionNumber },
          },
          orderBy: { versionNumber: 'desc' },
          select: { id: true },
        });
        if (prev) {
          target = await this.getSnapshot(prev.id);
        }
      }
    }

    return { base, target };
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
}
