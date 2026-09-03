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
import { CreateListGermsDto } from './dto/create-list_germs.dto';
import { UpdateListGermsDto } from './dto/update-list_germs.dto';
import { ListGermsService } from './list_germs.service';


@Controller('list-germs')
export class ListGermsController {
  constructor(
    private readonly list_germsService: ListGermsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('germs.read')
  @Get()
  getListGermsLists() {
    return this.list_germsService.getListGermsLists();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('germs.read')
  @Get('order')
  getListGermsListsOrder() {
    return this.list_germsService.getListGermsListsOrder();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('germs.read')
  @Get(':id')
  getListGerms(@Param('id', ParseIntPipe) id: number) {
    return this.list_germsService.getListGerms(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('germs.create')
  @Post()
  createListGerms(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateListGermsDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.list_germsService.createListGerms(
      body,
      actorUserId ?? undefined,
    );
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateListGerms(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateListGermsDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }
    const userId = actorUserId;

    const requiredPermissions: string[] = [];

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (Object.prototype.hasOwnProperty.call(body, 'germen')) {
        requiredPermissions.push('germs.update');
      }

      if (Object.prototype.hasOwnProperty.call(body, 'annulled')) {
        requiredPermissions.push('germs.change-status');
      }
    }

    if (requiredPermissions.length > 0) {
      const authorized = await this.authorizationService.hasAllPermissions(
        userId,
        requiredPermissions,
      );

      if (!authorized) {
        throw new ForbiddenException('GERM_PERMISSION_REQUIRED');
      }
    }

    return this.list_germsService.updateListGerms(
      id,
      body,
      actorUserId,
    );
  }
}
