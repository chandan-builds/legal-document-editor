import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { ClauseService } from './clause.service';
import { DocumentController } from './document.controller';
import { ClauseController } from './clause.controller';

@Module({
  controllers: [DocumentController, ClauseController],
  providers: [DocumentService, ClauseService],
  exports: [DocumentService, ClauseService],
})
export class DocumentModule {}
