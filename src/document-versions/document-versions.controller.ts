import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { SaveDocumentDraftDto } from './dto/save-document-draft.dto';
import { PublishDocumentVersionDto } from './dto/publish-document-version.dto';
import { DocumentVersionsService } from './document-versions.service';

@Controller('document-versions')
@UseGuards(JwtUserGuard, PermissionGuard)
export class DocumentVersionsController {
  constructor(private readonly service: DocumentVersionsService) {}
  @Get('draft') @RequirePermissions('document-versions.read') getDraft(@Query('laboratoryId', ParseIntPipe) laboratoryId: number, @Query('documentType') documentType: string) { return this.service.getDraft(laboratoryId, documentType); }
  @Get('active') @RequirePermissions('document-versions.read') getActive(@Query('laboratoryId', ParseIntPipe) laboratoryId: number, @Query('documentType') documentType: string) { return this.service.getActive(laboratoryId, documentType); }
  @Get() @RequirePermissions('document-versions.read') list(@Query('laboratoryId', ParseIntPipe) laboratoryId: number, @Query('documentType') documentType: string) { return this.service.listVersions(laboratoryId, documentType); }
  @Post('draft') @RequirePermissions('document-versions.save-draft') saveDraft(@Req() request: SecurityAuthenticatedRequest, @Body() dto: SaveDocumentDraftDto) { return this.service.saveDraft(dto, getSecurityAuditActorUserId(request) as number); }
  @Post('publish') @RequirePermissions('document-versions.publish') publish(@Req() request: SecurityAuthenticatedRequest, @Body() dto: PublishDocumentVersionDto) { return this.service.publish(dto, getSecurityAuditActorUserId(request) as number); }
  @Patch(':id/activate') @RequirePermissions('document-versions.activate') activate(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.activate(id, getSecurityAuditActorUserId(request) as number); }
  @Post(':id/draft') @RequirePermissions('document-versions.save-draft') createDraft(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.createDraftFromVersion(id, getSecurityAuditActorUserId(request) as number); }
  @Patch(':id/archive') @RequirePermissions('document-versions.archive') archive(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.archive(id, getSecurityAuditActorUserId(request) as number); }
}