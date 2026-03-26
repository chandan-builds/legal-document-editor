import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for OnlyOffice callback payload.
 * @see https://api.onlyoffice.com/editors/callback
 */
export class OnlyOfficeCallbackDto {
  @IsNumber()
  status: number;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  changesurl?: string;

  @IsOptional()
  @IsArray()
  actions?: Array<{ type: number; userid: string }>;

  @IsOptional()
  @IsArray()
  users?: string[];

  @IsOptional()
  history?: any;

  @IsOptional()
  @IsString()
  lastsave?: string;

  @IsOptional()
  @IsBoolean()
  notmodified?: boolean;

  @IsOptional()
  @IsString()
  filetype?: string;

  @IsOptional()
  @IsNumber()
  forcesavetype?: number;

  @IsOptional()
  @IsString()
  userdata?: string;
}
