import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma';

export const DOC_ROLES_KEY = 'docRoles';
export const ACCESS_MODE_KEY = 'accessModes';

/**
 * Guard that verifies the authenticated user is a collaborator on the requested document.
 * Extracts documentId from route params (supports: documentId, docId, id).
 * Optionally enforces specific CollaboratorRole(s) via @DocRoles() decorator.
 * Optionally enforces specific AccessMode(s) via @RequireMode() decorator.
 * Attaches `request.collaboratorRole` and `request.accessMode` for downstream use.
 */
@Injectable()
export class DocumentAccessGuard implements CanActivate {
  private readonly logger = new Logger(DocumentAccessGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const documentId =
      request.params.documentId || request.params.docId || request.params.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!documentId) {
      // If no document param found, skip this guard (e.g. non-document endpoints)
      return true;
    }

    const collaborator = await this.prisma.documentCollaborator.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });

    if (!collaborator) {
      this.logger.warn(
        `User ${userId} denied access to document ${documentId}`,
      );
      throw new ForbiddenException('Not a collaborator on this document');
    }

    // Check required roles (if @DocRoles() was specified)
    const requiredRoles = this.reflector.get<string[]>(
      DOC_ROLES_KEY,
      context.getHandler(),
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(collaborator.role)) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredRoles.join(' or ')}`,
        );
      }
    }

    // Check required access modes (if @RequireMode() was specified)
    const requiredModes = this.reflector.get<string[]>(
      ACCESS_MODE_KEY,
      context.getHandler(),
    );

    if (requiredModes && requiredModes.length > 0) {
      if (!requiredModes.includes(collaborator.accessMode)) {
        throw new ForbiddenException(
          `Your access mode (${collaborator.accessMode}) does not permit this action. Required: ${requiredModes.join(' or ')}`,
        );
      }
    }

    // Attach for downstream use
    request.collaboratorRole = collaborator.role;
    request.accessMode = collaborator.accessMode;
    return true;
  }
}
