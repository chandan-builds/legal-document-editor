import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AuditService } from '../audit';
import {
  DocumentStatus,
  ClauseStatus,
  AuditAction,
  SuggestionStatus,
  CollaboratorRole,
  UserRole,
} from '@prisma/client';

@Injectable()
export class FinalizationService {
  private readonly logger = new Logger(FinalizationService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Checks if a document is ready for finalization.
   * Criteria:
   * - All clauses are MUTUALLY_APPROVED or OMITTED.
   * - No pending suggestions.
   * - No unresolved comments.
   */
  async checkReadiness(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        clauses: true,
        editSuggestions: { where: { status: SuggestionStatus.PENDING } },
        comments: { where: { resolvedBy: null } },
      },
    });

    if (!doc) throw new NotFoundException('Document not found');

    const unfinalizedClauses = doc.clauses.filter(
      (c) =>
        c.status !== ClauseStatus.MUTUALLY_APPROVED &&
        c.status !== ClauseStatus.OMITTED,
    );

    const isReady =
      unfinalizedClauses.length === 0 &&
      doc.editSuggestions.length === 0 &&
      doc.comments.length === 0;

    return {
      isReady,
      unfinalizedClausesCount: unfinalizedClauses.length,
      pendingSuggestionsCount: doc.editSuggestions.length,
      unresolvedCommentsCount: doc.comments.length,
      currentStatus: doc.status,
    };
  }

  /**
   * Marks the document as FINAL_READY or immediately FINALIZED.
   */
  async finalizeDocument(documentId: string, userId: string) {
    const readiness = await this.checkReadiness(documentId, userId);
    if (!readiness.isReady) {
      throw new BadRequestException(
        'Document is not ready for finalization. Resolve all clauses, suggestions, and comments first.',
      );
    }

    const collaborator = await this.prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { user: { select: { role: true } } },
    });

    if (
      !collaborator ||
      (collaborator.role !== CollaboratorRole.OWNER &&
        collaborator.user.role !== UserRole.CLIENT)
    ) {
      throw new ForbiddenException(
        'Only the OWNER or CLIENT can finalize the document',
      );
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.FINALIZED },
    });

    await this.auditService.log({
      documentId,
      userId,
      userRole: collaborator.user.role,
      action: AuditAction.DOCUMENT_FINALIZED,
    });

    this.logger.log(`Document ${documentId} finalized by ${userId}`);
    return updated;
  }
}
