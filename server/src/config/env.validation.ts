import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error:\n${errors.toString()}`);
  }

  return validatedConfig;
}
