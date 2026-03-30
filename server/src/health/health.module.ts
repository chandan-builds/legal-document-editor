import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [TerminusModule, ScheduleModule.forRoot()],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, KeepAliveService],
})
export class HealthModule {}
