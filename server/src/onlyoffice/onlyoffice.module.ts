import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OnlyOfficeController } from './onlyoffice.controller';
import { OnlyOfficeService } from './onlyoffice.service';
import { FileStorageModule } from '../file-storage';
import { PrismaModule } from '../prisma';
import { AuditModule } from '../audit';

@Module({
  imports: [ConfigModule, FileStorageModule, PrismaModule, AuditModule],
  controllers: [OnlyOfficeController],
  providers: [OnlyOfficeService],
  exports: [OnlyOfficeService],
})
export class OnlyOfficeModule {}
