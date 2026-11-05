import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreatePlatformLaboratoryDto } from './dto/create-platform-laboratory.dto';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { PlatformLaboratoryAdminService } from './platform-laboratory-admin.service';
@Controller('platform')
@UseGuards(JwtUserGuard, PlatformOwnerGuard)
export class PlatformController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly provisioning: PlatformProvisioningService,
    private readonly laboratoryAdmin: PlatformLaboratoryAdminService,
  ) {}
  @Get('me') me(@Req() request:{user?:unknown}){return request.user;}
  @Post('laboratories') createLaboratory(@Req() request:{user?:{id?:number;userId?:number;identityType?:string}},@Body() body:CreatePlatformLaboratoryDto){const platformOwnerId=Number(request.user?.userId ?? request.user?.id);if(!Number.isInteger(platformOwnerId)||platformOwnerId<=0)throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');return this.provisioning.provision(body,platformOwnerId);}
  @Get('laboratories') async laboratories(){return this.dataSource.query(`SELECT l.id,l.rif,l.name,l.business_name AS "businessName",l.address,(SELECT COUNT(*)::int FROM laboratory_branches b WHERE b.laboratory_id=l.id) AS "branchCount",(SELECT COUNT(*)::int FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount",(SELECT COUNT(*)::int FROM laboratory_catalog_packages cp WHERE cp.laboratory_id=l.id) AS "catalogPackageCount" FROM laboratory l ORDER BY upper(btrim(l.name)),l.id`);}

  @Get('laboratories/:laboratoryId')
  getLaboratory(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.getLaboratory(this.parseId(id));
  }

  @Patch('laboratories/:laboratoryId')
  updateLaboratory(
    @Param('laboratoryId') id: string,
    @Body() body: Record<string, unknown>,
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.updateLaboratory(this.parseId(id), body, this.ownerId(request));
  }

  @Get('laboratories/:laboratoryId/packages')
  listPackages(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.listPackages(this.parseId(id));
  }

  @Post('laboratories/:laboratoryId/packages')
  installPackage(
    @Param('laboratoryId') id: string,
    @Body() body: { packageCode?: string },
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.installPackage(this.parseId(id), body?.packageCode ?? '', this.ownerId(request));
  }

  @Delete('laboratories/:laboratoryId/packages/:packageCode')
  uninstallPackage(@Param('laboratoryId') id: string, @Param('packageCode') packageCode: string) {
    return this.laboratoryAdmin.uninstallPackage(this.parseId(id), packageCode);
  }

  @Get('laboratories/:laboratoryId/branches')
  listBranches(@Param('laboratoryId') id: string) {
    return this.laboratoryAdmin.listBranches(this.parseId(id));
  }

  @Post('laboratories/:laboratoryId/branches')
  addBranch(@Param('laboratoryId') id: string, @Body() body: Record<string, unknown>) {
    return this.laboratoryAdmin.addBranch(this.parseId(id), body);
  }

  @Delete('laboratories/:laboratoryId/branches/:branchId')
  removeBranch(@Param('laboratoryId') id: string, @Param('branchId') branchId: string) {
    return this.laboratoryAdmin.removeBranch(this.parseId(id), this.parseId(branchId));
  }

  @Delete('laboratories/:laboratoryId')
  deleteLaboratory(
    @Param('laboratoryId') id: string,
    @Body() body: { password?: string },
    @Req() request: { user?: { id?: number; userId?: number; identityType?: string } },
  ) {
    return this.laboratoryAdmin.deleteLaboratory(this.parseId(id), this.ownerId(request), body?.password ?? '');
  }

  private ownerId(request: { user?: { id?: number; userId?: number; identityType?: string } }) {
    if (request.user?.identityType !== 'platform-owner') throw new ForbiddenException('PLATFORM_OWNER_REQUIRED');
    const id = Number(request.user.userId ?? request.user.id);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('PLATFORM_OWNER_CONTEXT_REQUIRED');
    return id;
  }

  private parseId(value: string) {
    if (!/^[1-9]\d*$/.test(value)) throw new BadRequestException('PLATFORM_LABORATORY_ID_INVALID');
    const id = Number(value);
    if (!Number.isSafeInteger(id)) throw new BadRequestException('PLATFORM_LABORATORY_ID_INVALID');
    return id;
  }
}
