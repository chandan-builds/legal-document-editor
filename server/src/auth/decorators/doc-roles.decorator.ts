import { SetMetadata } from '@nestjs/common';
import { DOC_ROLES_KEY } from '../guards/document-access.guard';
import { CollaboratorRole } from '@prisma/client';

/**
 * Decorator to specify required CollaboratorRole(s) for a route.
 * Used in conjunction with DocumentAccessGuard.
 *
 * @example
 * @DocRoles('OWNER', 'EDITOR')
 * @UseGuards(JwtAuthGuard, DocumentAccessGuard)
 * async createClause() { ... }
 */
export const DocRoles = (...roles: CollaboratorRole[]) =>
  SetMetadata(DOC_ROLES_KEY, roles);
