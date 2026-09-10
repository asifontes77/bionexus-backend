import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { AdmissionTariffResolverService } from './admission-tariff-resolver.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('admission-tariffs')
export class AdmissionTariffResolverController {
  constructor(private readonly service: AdmissionTariffResolverService) {}

  @RequirePermissions('tariffs.read')
  @Get('resolve')
  resolve(@Query('clientId', ParseIntPipe) clientId: number, @Query('examCatalogIds') rawIds?: string) {
    const examCatalogIds = rawIds ? rawIds.split(',').filter(Boolean).map(Number) : [];
    return this.service.resolve(clientId, examCatalogIds);
  }
}

