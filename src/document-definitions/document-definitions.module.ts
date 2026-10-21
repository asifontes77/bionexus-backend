import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DocumentDefinition } from './document-definition.entity';
import { DocumentDraft } from './document-draft.entity';
import { DocumentDefinitionsController } from './document-definitions.controller';
import { DocumentDefinitionsService } from './document-definitions.service';

/** Registers document definition persistence, authorization and audit services. */
@Module({
  imports: [AuthorizationModule, SecurityAuditModule, TypeOrmModule.forFeature([DocumentDefinition, DocumentDraft])],
  controllers: [DocumentDefinitionsController],
  providers: [DocumentDefinitionsService],
  exports: [DocumentDefinitionsService, TypeOrmModule],
})
export class DocumentDefinitionsModule {}