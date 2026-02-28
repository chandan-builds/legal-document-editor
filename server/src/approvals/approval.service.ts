import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { ClauseActionDto, ApprovalAction } from './dto';
import {
  CollaboratorRole,
  ClauseStatus,
  DocumentStatus,
  UserRole,
  AuditAction,
} from '@prisma/client';
import { AuditService } from '../audit';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Process an approval action on a clause (State Machine)
   */
  async processAction(clauseId: string, dto: ClauseActionDto, userId: string) {
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
      include: {
        document: { include: { collaborators: true } },
        approvals: true,
      },
    });

    if (!clause) throw new NotFoundException('Clause not found');

    const collaborator = clause.document.collaborators.find(
      (c) => c.userId === userId,
    );
    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this document');
    }

    const role = collaborator.role;

    // Reject if clause is locked by someone else
    if (clause.isLocked && clause.lockedBy !== userId) {
      throw new BadRequestException('Clause is locked by another user');
    }

    // State Machine Transitions
    let newStatus = clause.status;

    switch (dto.action) {
      case ApprovalAction.REQUEST_CHANGES:
        newStatus = this.handleSubmitForApproval(role, clause.status);
        break;

      case ApprovalAction.APPROVE:
        newStatus = await this.handleApprove(clauseId, role, clause.status);
        break;

      case ApprovalAction.REJECT:
        newStatus = ClauseStatus.DRAFT;
        // Invalidate all existing approvals
        await this.prisma.clauseApproval.deleteMany({ where: { clauseId } });
        break;

      case ApprovalAction.OMIT:
        newStatus = ClauseStatus.OMITTED;
        await this.prisma.clauseApproval.deleteMany({ where: { clauseId } });
        break;

      default:
        throw new BadRequestException('Invalid action');
    }

    // Record the action
    const userRoleValue =
      role === CollaboratorRole.OWNER || role === CollaboratorRole.EDITOR
        ? UserRole.CLIENT
        : UserRole.VENDOR;
    // Note: Assuming versionRef is 1 for now, a full implementation would track clause versions
    const versionRef = 1;

    // Create a new approval record instead of upserting (since the unique constraint includes versionRef)
    await this.prisma.clauseApproval.create({
      data: {
        clauseId,
        documentId: clause.documentId,
        userId,
        userRole: userRoleValue,
        action: dto.action,
        reason: dto.reason,
        versionRef,
      },
    });

    // Update the clause status
    const updatedClause = await this.prisma.clause.update({
      where: { id: clauseId },
      data: { status: newStatus },
      include: {
        approvals: {
          include: { user: { select: { displayName: true, role: true } } },
        },
      },
    });

    // Auto-accept all pending suggestions if the clause is now Mutually Approved
    if (newStatus === ClauseStatus.MUTUALLY_APPROVED) {
      const resolvedCount = await this.prisma.editSuggestion.updateMany({
        where: { clauseId, status: 'PENDING' },
        data: {
          status: 'ACCEPTED',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
      if (resolvedCount.count > 0) {
        this.logger.log(
          `Auto-accepted ${resolvedCount.count} suggestions for MUTUALLY_APPROVED clause ${clauseId}`,
        );
      }
    }

    // Check if whole document can be finalized
    await this.checkDocumentFinalization(
      clause.documentId,
      userId,
      userRoleValue,
    );

    this.logger.log(
      `Clause ${clauseId} status changed to ${newStatus} via ${dto.action} by ${userId}`,
    );

    // Audit log
    const auditActionMap: Record<string, AuditAction> = {
      [ApprovalAction.APPROVE]: AuditAction.CLAUSE_APPROVED,
      [ApprovalAction.REJECT]: AuditAction.CLAUSE_REJECTED,
      [ApprovalAction.OMIT]: AuditAction.CLAUSE_OMITTED,
      [ApprovalAction.REQUEST_CHANGES]:
        AuditAction.CLAUSE_SUBMITTED_FOR_APPROVAL,
    };
    await this.auditService.log({
      documentId: clause.documentId,
      userId,
      userRole: userRoleValue,
      action: auditActionMap[dto.action] || AuditAction.CLAUSE_EDITED,
      entityType: 'Clause',
      entityId: clauseId,
      previousValue: { status: clause.status },
      newValue: { status: newStatus, action: dto.action, reason: dto.reason },
    });

    return updatedClause;
  }

  /**
   * Get the aggregate approval status of a document
   */
  async getDocumentApprovalStatus(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { collaborators: true },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.collaborators.some((c) => c.userId === userId)) {
      throw new ForbiddenException('Access denied');
    }

    const clauses = await this.prisma.clause.findMany({
      where: { documentId },
      select: { id: true, status: true },
    });

    const total = clauses.length;
    const approved = clauses.filter(
      (c) => c.status === ClauseStatus.MUTUALLY_APPROVED,
    ).length;
    const omitted = clauses.filter(
      (c) => c.status === ClauseStatus.OMITTED,
    ).length;
    const pending = total - approved - omitted;

    return {
      total,
      approved,
      omitted,
      pending,
      isReadyToFinalize: total > 0 && pending === 0,
    };
  }

  // ── State Machine Helpers ─────────────────────────────────────────

  private handleSubmitForApproval(
    role: CollaboratorRole,
    currentStatus: ClauseStatus,
  ): ClauseStatus {
    if (currentStatus === ClauseStatus.MUTUALLY_APPROVED) {
      throw new BadRequestException('Clause is already finalized');
    }

    // Who is submitting? The other party needs to approve.
    // Assuming OWNER/EDITOR represents the Client side (Firm), and REVIEWER represents Vendor side (Client).
    // This could be made more sophisticated with explicit firm vs external tagging.
    if (role === CollaboratorRole.OWNER || role === CollaboratorRole.EDITOR) {
      return ClauseStatus.PENDING_VENDOR_APPROVAL;
    } else {
      return ClauseStatus.PENDING_CLIENT_APPROVAL;
    }
  }

  private async handleApprove(
    clauseId: string,
    role: CollaboratorRole,
    currentStatus: ClauseStatus,
  ): Promise<ClauseStatus> {
    if (currentStatus === ClauseStatus.MUTUALLY_APPROVED) {
      throw new BadRequestException('Clause is already finalized');
    }

    // Check if the other party has already approved
    const existingApprovals = await this.prisma.clauseApproval.findMany({
      where: { clauseId, action: ApprovalAction.APPROVE },
    });

    const hasOwnerApproval = existingApprovals.some(
      (a) => a.userRole === UserRole.CLIENT,
    );
    const hasVendorApproval = existingApprovals.some(
      (a) => a.userRole === UserRole.VENDOR,
    );

    const isOwnerApproving =
      role === CollaboratorRole.OWNER || role === CollaboratorRole.EDITOR;

    if (isOwnerApproving && hasVendorApproval) {
      return ClauseStatus.MUTUALLY_APPROVED; // Both have now approved
    }

    if (!isOwnerApproving && hasOwnerApproval) {
      return ClauseStatus.MUTUALLY_APPROVED; // Both have now approved
    }

    // Only one party has approved
    if (isOwnerApproving) {
      return ClauseStatus.CLIENT_APPROVED;
    } else {
      return ClauseStatus.VENDOR_APPROVED;
    }
  }

  private async checkDocumentFinalization(
    documentId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const clauses = await this.prisma.clause.findMany({
      where: { documentId },
      select: { status: true },
    });

    const pending = clauses.some(
      (c) =>
        c.status !== ClauseStatus.MUTUALLY_APPROVED &&
        c.status !== ClauseStatus.OMITTED,
    );

    if (!pending && clauses.length > 0) {
      // All clauses are mutually approved or omitted, auto-finalize the document
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FINALIZED },
      });

      await this.auditService.log({
        documentId,
        userId,
        userRole,
        action: AuditAction.DOCUMENT_FINALIZED,
        newValue: { status: DocumentStatus.FINALIZED },
      });

      this.logger.log(
        `Document ${documentId} finalized automatically by ${userId}.`,
      );
    } else {
      // Revert from finalized if a clause was reopened
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { status: true },
      });
      if (doc?.status === DocumentStatus.FINALIZED) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.IN_REVIEW },
        });
      }
    }
  }
}
