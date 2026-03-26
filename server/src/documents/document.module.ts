import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { ClauseService } from './clause.service';
import { DocumentController } from './document.controller';
import { ClauseController } from './clause.controller';
import { FileStorageModule } from '../file-storage';

@Module({
  imports: [FileStorageModule],
  controllers: [DocumentController, ClauseController],
  providers: [DocumentService, ClauseService],
  exports: [DocumentService, ClauseService],
})
export class DocumentModule {}
