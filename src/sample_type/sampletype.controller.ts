import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateSampletypeDto } from './dto/create-sampletype.dto';
import { UpdateSampletypeDto } from './dto/update-sampletype.dto';
import { SampleTypeService } from './sampletype.service';

@Controller('Sampletype')
export class SampletypeController {
  constructor(
    private readonly sampletypeService: SampleTypeService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('sample-types.read')
  @Get(':id')
  getSampletype(@Param('id', ParseIntPipe) id: number) {
    return this.sampletypeService.getSampletype(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('sample-types.read')
  @Get()
  getSampletypes() {
    return this.sampletypeService.getSampletypes();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('sample-types.create')
  @Post()
  createSampletype(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateSampletypeDto,
  ) {
    return this.sampletypeService.createSampletype(
      body,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateSampletype(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSampletypeDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null)
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    if (
      !(await this.authorizationService.hasAllPermissions(actorUserId, [
        'sample-types.update',
      ]))
    ) {
      throw new ForbiddenException('SAMPLE_TYPE_PERMISSION_REQUIRED');
    }
    return this.sampletypeService.updateSampletype(id, body, actorUserId);
  }
}
