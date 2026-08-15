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
import { CreateTypepaymantDto } from './dto/create-typepayment.dto';
import { UpdateTypepaymantDto } from './dto/update-typepayment.dto';
import { TypePaymentService } from './typepayment.service';

@Controller('Typepayment')
export class typepaymentController {
  constructor(
    private readonly typepaymentService: TypePaymentService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('typepayment.read')
  @Get(':id')
  getTypepayment(@Param('id', ParseIntPipe) id: number) {
    return this.typepaymentService.getTypepayment(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('typepayment.read')
  @Get()
  getTypepayments() {
    return this.typepaymentService.getTypepayments();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('typepayment.create')
  @Post()
  createTypepayment(
    @Req() request: SecurityAuthenticatedRequest,
    @Body() body: CreateTypepaymantDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.typepaymentService.createTypepayment(
      body,
      actorUserId ?? undefined,
    );
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateTypepayment(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTypepaymantDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }
    const requiredPermissions: string[] = [];
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const contentFields = [
        'description',
        'description_1',
        'description_2',
        'only_dollars',
      ];
      if (contentFields.some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
        requiredPermissions.push('typepayment.update');
      }
      if (Object.prototype.hasOwnProperty.call(body, 'annulled')) {
        requiredPermissions.push('typepayment.change-status');
      }
    }
    if (requiredPermissions.length > 0) {
      const authorized = await this.authorizationService.hasAllPermissions(
        actorUserId,
        requiredPermissions,
      );
      if (!authorized) {
        throw new ForbiddenException('TYPEPAYMENT_PERMISSION_REQUIRED');
      }
    }
    return this.typepaymentService.updateTypepayment(
      id,
      body,
      actorUserId,
    );
  }
}
