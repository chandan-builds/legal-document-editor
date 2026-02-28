import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsObject()
  @IsOptional()
  changeSummary?: Record<string, any>;

  // snapshot will be extracted from the request body as a JSON array of numbers (Uint8Array)
  snapshot: number[];
}
