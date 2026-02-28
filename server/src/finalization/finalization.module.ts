import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FinalizationService } from './finalization.service';
import { FinalizationController } from './finalization.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [FinalizationService],
  controllers: [FinalizationController],
  exports: [FinalizationService],
})
export class FinalizationModule {}
