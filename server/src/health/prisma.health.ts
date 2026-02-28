import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.prisma.isHealthy();
    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('Database check failed', result);
  }
}
