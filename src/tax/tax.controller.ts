import {
  Body,
  Controller,
  Delete,
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
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { TaxService } from './tax.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @RequirePermissions('tax.read')
  @Get()
  getTaxes() {
    return this.taxService.getTaxes();
  }

  @RequirePermissions('tax.read')
  @Get(':id')
  getTax(@Param('id', ParseIntPipe) id: number) {
    return this.taxService.getTax(id);
  }

  @RequirePermissions('tax.create')
  @Post()
  createTax(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateTaxDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.taxService.createTax(body, actorUserId ?? undefined);
  }

  @RequirePermissions('tax.update')
  @Patch(':id')
  updateTax(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaxDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.taxService.updateTax(id, body, actorUserId ?? undefined);
  }

  @RequirePermissions('tax.delete')
  @Delete(':id')
  deleteTax(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.taxService.deleteTax(id, actorUserId ?? undefined);
  }
}