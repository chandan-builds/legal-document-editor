import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ClauseStatus, ApprovalAction } from '@prisma/client';

export { ApprovalAction };

export class ClauseActionDto {
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
