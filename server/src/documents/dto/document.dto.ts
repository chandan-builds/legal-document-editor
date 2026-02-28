import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsObject,
} from 'class-validator';
import { DocumentStatus, CollaboratorRole, AccessMode } from '@prisma/client';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  file?: any;
}

export class UpdateDocumentDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  title?: string;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AddCollaboratorDto {
  @IsUUID()
  userId: string;

  @IsEnum(CollaboratorRole)
  @IsOptional()
  role?: CollaboratorRole;

  @IsEnum(AccessMode)
  @IsOptional()
  accessMode?: AccessMode;
}

export class CreateSectionDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  orderIndex?: number;
}

export class CreateClauseDto {
  @IsUUID()
  sectionId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsObject()
  contentJson: Record<string, any>;

  @IsOptional()
  orderIndex?: number;
}

export class UpdateClauseDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsObject()
  @IsOptional()
  contentJson?: Record<string, any>;
}
