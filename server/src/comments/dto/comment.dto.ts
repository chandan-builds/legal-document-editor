import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  @IsOptional()
  clauseId?: string;

  @IsString()
  @MaxLength(5000)
  text: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  quotedText?: string;

  @IsInt()
  @IsOptional()
  positionFrom?: number;

  @IsInt()
  @IsOptional()
  positionTo?: number;
}

export class ReplyCommentDto {
  @IsString()
  @MaxLength(5000)
  text: string;
}
