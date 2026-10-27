import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreatePlatformLaboratoryDto } from './dto/create-platform-laboratory.dto';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { PlatformProvisioningService } from './platform-provisioning.service';
@Controller('platform')
@UseGuards(JwtUserGuard, PlatformOwnerGuard)
export class PlatformController {
  constructor(private readonly dataSource: DataSource,private readonly provisioning:PlatformProvisioningService) {}
  @Get('me') me(@Req() request:{user?:unknown}){return request.user;}
  @Post('laboratories') createLaboratory(@Body() body:CreatePlatformLaboratoryDto){return this.provisioning.provision(body);}
  @Get('laboratories') async laboratories(){return this.dataSource.query(`SELECT l.id,l.rif,l.name,l.business_name AS "businessName",l.address,(SELECT COUNT(*)::int FROM laboratory_branches b WHERE b.laboratory_id=l.id) AS "branchCount",(SELECT COUNT(*)::int FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount" FROM laboratory l ORDER BY upper(btrim(l.name)),l.id`);}
}
