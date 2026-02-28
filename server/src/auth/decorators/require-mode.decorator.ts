import { SetMetadata } from '@nestjs/common';
import { ACCESS_MODE_KEY } from '../guards/document-access.guard';
import { AccessMode } from '@prisma/client';

/**
 * Decorator to specify required AccessMode(s) for a route.
 * Used in conjunction with DocumentAccessGuard.
 *
 * @example
 * @RequireMode('SUGGEST', 'EDIT')
 * @UseGuards(JwtAuthGuard, DocumentAccessGuard)
 * async createSuggestion() { ... }
 */
export const RequireMode = (...modes: AccessMode[]) =>
  SetMetadata(ACCESS_MODE_KEY, modes);
