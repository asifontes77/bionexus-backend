import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateDocumentDefinitionDto } from './dto/create-document-definition.dto';
import { UpdateDocumentDefinitionDto } from './dto/update-document-definition.dto';
import { DocumentDefinitionsService } from './document-definitions.service';
import { ChangeDocumentDefinitionStatusDto } from './dto/change-document-definition-status.dto';
import { SaveDocumentDesignDto } from './dto/save-document-design.dto';

/** Exposes the protected document definition administration endpoints. */
@Controller('document-definitions')
@UseGuards(JwtUserGuard, PermissionGuard)
export class DocumentDefinitionsController {
  constructor(private readonly service: DocumentDefinitionsService) {}

  /** Lists document definitions for one laboratory. */
  @Get() @RequirePermissions('document-definitions.read') list(@Query('laboratoryId', ParseIntPipe) laboratoryId: number) { return this.service.list(laboratoryId); }
  /** Gets one document definition. */
  @Get(':id') @RequirePermissions('document-definitions.read') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  /** Gets the editable design associated with one comprobante. */
  @Get(':id/design') @RequirePermissions('document-definitions.read') getDesign(@Param('id', ParseIntPipe) id: number) { return this.service.getDesign(id); }
  /** Saves the editable design associated with one comprobante. */
  @Patch(':id/design') @RequirePermissions('document-definitions.update') saveDesign(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveDocumentDesignDto) { return this.service.saveDesign(id, dto, getSecurityAuditActorUserId(request) as number); }
  /** Creates a document definition. */
  @Post() @RequirePermissions('document-definitions.create') create(@Req() request: SecurityAuthenticatedRequest, @Body() dto: CreateDocumentDefinitionDto) { return this.service.create(dto, getSecurityAuditActorUserId(request) as number); }
  /** Duplicates one document definition and its editable draft as a new inactive definition. */
  @Post(':id/duplicate') @RequirePermissions('document-definitions.create') duplicate(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.duplicate(id, getSecurityAuditActorUserId(request) as number); }
  /** Deletes one inactive document definition and its editable draft. */
  @Delete(':id') @RequirePermissions('document-definitions.update') delete(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.delete(id, getSecurityAuditActorUserId(request) as number); }
  /** Updates editable document definition fields. */
  @Patch(':id') @RequirePermissions('document-definitions.update') update(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentDefinitionDto) { return this.service.update(id, dto, getSecurityAuditActorUserId(request) as number); }
  /** Activates the selected document definition. */
  @Patch(':id/activate') @RequirePermissions('document-definitions.activate') activate(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.activate(id, getSecurityAuditActorUserId(request) as number); }
  /** Activates or deactivates one definition while preserving the active invariant. */
  @Patch(':id/status') @RequirePermissions('document-definitions.activate') changeStatus(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: ChangeDocumentDefinitionStatusDto) { return this.service.changeStatus(id, dto.isActive, getSecurityAuditActorUserId(request) as number); }
}
