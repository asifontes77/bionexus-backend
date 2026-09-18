import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { ChangeTariffStatusDto } from './dto/change-tariff-status.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { TariffsService } from './tariffs.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly service: TariffsService) {}

  @RequirePermissions('tariffs.read')
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @RequirePermissions('tariffs.read')
  @Get('active')
  getActive() {
    return this.service.getActive();
  }
  @RequirePermissions('tariffs.update')
  @Patch('reorder')
  reorder(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: { ids?: unknown },
  ) {
    return this.service.reorder(
      body?.ids,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }


  @RequirePermissions('tariffs.read')
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @RequirePermissions('tariffs.create')
  @Post()
  create(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateTariffDto,
  ) {
    return this.service.create(
      body,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }

  @RequirePermissions('tariffs.update')
  @Patch(':id')
  update(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTariffDto,
  ) {
    return this.service.update(
      id,
      body,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }

  @RequirePermissions('tariffs.update')
  @Patch(':id/status')
  changeStatus(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ChangeTariffStatusDto,
  ) {
    return this.service.changeStatus(
      id,
      body,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }

  @RequirePermissions('tariffs.update')
  @Post(':id/default')
  setDefault(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.setDefault(
      id,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }
}
