import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateSpecialTestItemsDto } from './dto/create-special_test_itms.dto';
import { updateSpecialTestItemsDto } from './dto/update-special_test_itms.dto';
import { SpecialTestItemsService } from './special_test_items.service';

@Controller('specialtestItems')
@UseGuards(JwtUserGuard, PermissionGuard)
export class SpecialtestItemsController {
  constructor(private readonly service: SpecialTestItemsService) {}
  @RequirePermissions('special-tests.update') @Post()
  createSpecialTestItems(@Req() request: SecurityAuthenticatedRequest, @Body() body: CreateSpecialTestItemsDto) { return this.service.createSpecialTestItems(body, getSecurityAuditActorUserId(request) ?? undefined); }
  @RequirePermissions('special-tests.read') @Get()
  getSpecialTestItemsList() { return this.service.getSpecialTestItemsList(); }
  @RequirePermissions('special-tests.read') @Get(':id')
  getSpecialTestItems(@Param('id', ParseIntPipe) id: number) { return this.service.getSpecialTestItems(id); }
  @RequirePermissions('special-tests.update') @Patch(':id')
  updateSpecialTestItems(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: updateSpecialTestItemsDto) { return this.service.updateSpecialTestItems(id, body, getSecurityAuditActorUserId(request) ?? undefined); }
  @RequirePermissions('special-tests.update') @Delete(':id')
  deleteTestItems(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.service.deleteTestItems(id, getSecurityAuditActorUserId(request) ?? undefined); }
}
