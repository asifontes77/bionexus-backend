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
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateParasiticformsDto } from './dto/update-parasiticforms.dto';
import { ParasiticformsService } from './parasiticforms.service';

interface AuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
}

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
  createParasiticforms(@Body() body: CreateParasiticformsDto) {
    return this.parasiticformsService.createParasiticforms(body);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateParasiticforms(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateParasiticformsDto,
  ) {
    const userId = request.user?.userId;

    if (!Number.isInteger(userId) || userId === undefined || userId <= 0) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }

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

    return this.parasiticformsService.updateParasiticforms(id, body);
  }
}
