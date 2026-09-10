import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
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
import { ReplaceExamTariffPricesDto } from './dto/replace-exam-tariff-prices.dto';
import { ExamTariffPricesService } from './exam-tariff-prices.service';

@UseGuards(JwtUserGuard, PermissionGuard)
@Controller('exam-tariff-prices')
export class ExamTariffPricesController {
  constructor(private readonly service: ExamTariffPricesService) {}

  @RequirePermissions('tariffs.read')
  @Get(':examCatalogId')
  getByExam(@Param('examCatalogId', ParseIntPipe) examCatalogId: number) {
    return this.service.getByExam(examCatalogId);
  }

  @RequirePermissions('tariffs.update')
  @Put(':examCatalogId')
  replace(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('examCatalogId', ParseIntPipe) examCatalogId: number,
    @Body() body: ReplaceExamTariffPricesDto,
  ) {
    return this.service.replace(
      examCatalogId,
      body,
      getSecurityAuditActorUserId(request) ?? undefined,
    );
  }
}
