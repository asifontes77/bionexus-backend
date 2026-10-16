import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DocumentDraft } from './document-draft.entity';
import { DocumentVersion } from './document-version.entity';
import { DocumentVersionsController } from './document-versions.controller';
import { DocumentVersionsService } from './document-versions.service';

@Module({
  imports: [AuthorizationModule, SecurityAuditModule, TypeOrmModule.forFeature([DocumentDraft, DocumentVersion])],
  controllers: [DocumentVersionsController],
  providers: [DocumentVersionsService],
  exports: [DocumentVersionsService],
})
export class DocumentVersionsModule {}