import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EditType, SuggestionStatus } from '@prisma/client';

export class CreateSuggestionDto {
  @IsUUID()
  clauseId: string;

  @IsEnum(EditType)
  editType: EditType;

  @IsString()
  @IsOptional()
  originalContent?: string;

  @IsString()
  @IsOptional()
  suggestedContent?: string;

  @IsInt()
  @IsOptional()
  positionFrom?: number;

  @IsInt()
  @IsOptional()
  positionTo?: number;

  @IsObject()
  @IsOptional()
  formattingAttrs?: Record<string, any>;

  @IsInt()
  versionRef: number;
}

export class BatchCreateSuggestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSuggestionDto)
  suggestions: CreateSuggestionDto[];
}

export class ReviewSuggestionDto {
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus; // ACCEPTED or REJECTED
}

export class BatchReviewSuggestionsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  suggestionIds: string[];

  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;
}
