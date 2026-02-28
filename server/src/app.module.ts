import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { HealthModule } from './health';
import { AuthModule } from './auth/auth.module';
import { DocumentModule } from './documents';
import { SuggestionModule } from './suggestions';
import { ApprovalModule } from './approvals';
import { CommentModule } from './comments';
import { AuditModule } from './audit';
import { VersionModule } from './versions';
import { FinalizationModule } from './finalization/finalization.module';
import { YjsGateway } from './yjs.gateway';
import { validate } from './config';

@Module({
  imports: [
    // Rate Limiting (100 reqs / 60s)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Global config — validates env vars and makes ConfigService available everywhere
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),

    // Global database access
    PrismaModule,

    // Health check endpoints
    HealthModule,

    // Auth (JWT + roles)
    AuthModule,

    // Document & Clause engine
    DocumentModule,

    // Track Changes Engine
    SuggestionModule,

    // Approval Workflow Engine
    ApprovalModule,

    // Comments (PostgreSQL-backed)
    CommentModule,

    // Audit Logs (append-only, global)
    AuditModule,

    // Version Snapshots (PostgreSQL-backed)
    VersionModule,

    // Finalization Rules
    FinalizationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    YjsGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
