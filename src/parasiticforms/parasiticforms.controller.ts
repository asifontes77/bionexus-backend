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
import { JwtUserGuard } from '../users/jwt-user.guard';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateParasiticformsDto } from './dto/update-parasiticforms.dto';
import { ParasiticformsService } from './parasiticforms.service';


@Controller('parasiticforms')
export class ParasiticformsController {
  constructor(
    private readonly parasiticformsService: ParasiticformsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('parasiticforms.read')
  @Get()
  getParasiticformsLists() {
    return this.parasiticformsService.getParasiticformsLists();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('parasiticforms.read')
  @Get('order')
  getParasiticformsListsOrder() {
    return this.parasiticformsService.getParasiticformsListsOrder();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('parasiticforms.read')
  @Get(':id')
  getParasiticforms(@Param('id', ParseIntPipe) id: number) {
    return this.parasiticformsService.getParasiticforms(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('parasiticforms.create')
  @Post()
  createParasiticforms(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateParasiticformsDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.parasiticformsService.createParasiticforms(
      body,
      actorUserId ?? undefined,
    );
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateParasiticforms(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateParasiticformsDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }
    const userId = actorUserId;

    const requiredPermissions: string[] = [];

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        requiredPermissions.push('parasiticforms.update');
      }

      if (Object.prototype.hasOwnProperty.call(body, 'annulled')) {
        requiredPermissions.push('parasiticforms.change-status');
      }
    }

    if (requiredPermissions.length > 0) {
      const authorized = await this.authorizationService.hasAllPermissions(
        userId,
        requiredPermissions,
      );

      if (!authorized) {
        throw new ForbiddenException('PARASITICFORM_PERMISSION_REQUIRED');
      }
    }

    return this.parasiticformsService.updateParasiticforms(
      id,
      body,
      actorUserId,
    );
  }
}
