import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  displayName: string;

  @IsEnum(UserRole, { message: 'Role must be CLIENT, VENDOR, or ADMIN' })
  role: UserRole;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class SearchUsersDto {
  @IsString()
  @MinLength(2)
  query: string;
}
