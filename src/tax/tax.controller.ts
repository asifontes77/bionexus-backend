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
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { TaxService } from './tax.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('tax')
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly authorizationService: AuthorizationService,
  ) {}

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

  @Patch(':id')
  async updateTax(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaxDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null) throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    const requiredPermissions: string[] = [];
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (['description', 'value', 'only_dollars', 'always_subtotal'].some((field) => Object.prototype.hasOwnProperty.call(body, field))) requiredPermissions.push('tax.update');
      if (Object.prototype.hasOwnProperty.call(body, 'hide')) requiredPermissions.push('tax.update');
    }
    if (requiredPermissions.length > 0 && !(await this.authorizationService.hasAllPermissions(actorUserId, requiredPermissions))) {
      throw new ForbiddenException('TAX_PERMISSION_REQUIRED');
    }
    return this.taxService.updateTax(id, body, actorUserId);
  }

}
