import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AuditAction, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
/**
 * ARCHITECTURAL INVARIANT: This service is APPEND-ONLY.
 * No update() or delete() methods may be added.
 * The audit_logs table should have no UPDATE or DELETE grants in production.
 */
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only: Log an action to the audit trail.
   * This is called internally by other services — never directly by the frontend.
   */
  async log(params: {
    documentId: string;
    userId: string;
    userRole: UserRole;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    previousValue?: any;
    newValue?: any;
    metadata?: any;
    versionRef?: number;
  }) {
    const doc = await this.prisma.document.findUnique({
      where: { id: params.documentId },
      select: { currentVersion: true },
    });

    const versionRef = params.versionRef ?? doc?.currentVersion ?? 1;

    // Fetch previous hash for chaining
    const lastLog = await this.prisma.auditLog.findFirst({
      where: { documentId: params.documentId },
      orderBy: { createdAt: 'desc' },
      select: { newHash: true },
    });

    const previousHash = lastLog?.newHash || 'GENESIS_HASH';

    // Prepare data to hash
    const logData = {
      documentId: params.documentId,
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      previousValue: params.previousValue || undefined,
      newValue: params.newValue || undefined,
      metadata: params.metadata || undefined,
      versionRef,
      previousHash,
    };

    const newHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(logData))
      .digest('hex');

    const entry = await this.prisma.auditLog.create({
      data: {
        ...logData,
        newHash,
      },
    });

    this.logger.debug(
      `Audit: ${params.action} by ${params.userId} on doc ${params.documentId}`,
    );
    return entry;
  }

  /**
   * Fetch audit logs for a document (paginated, newest-first)
   */
  async findByDocument(documentId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { documentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where: { documentId } }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + logs.length < total,
    };
  }

  /**
   * Fetch activity timeline using cursor pagination (Phase F)
   */
  async findActivityTimeline(documentId: string, limit = 50, cursor?: string) {
    const fetchOptions: any = {
      where: { documentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        user: { select: { id: true, displayName: true, role: true } },
      },
    };

    if (cursor) {
      fetchOptions.cursor = { id: cursor };
      fetchOptions.skip = 1;
    }

    const logs = await this.prisma.auditLog.findMany(fetchOptions);

    return {
      logs,
      nextCursor: logs.length === limit ? logs[logs.length - 1].id : null,
      hasMore: logs.length === limit,
    };
  }
}
