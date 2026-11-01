import { PlatformOwnerGuard } from './platform-owner.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateCatalogReleaseDto, PublishCatalogReleaseDto, RetireCatalogReleaseDto } from './dto/catalog-release.dto';
import { PlatformCatalogReleaseService } from './platform-catalog-release.service';

@UseGuards(JwtUserGuard, PlatformOwnerGuard)
@Controller('platform/catalog-releases')
export class PlatformCatalogReleaseController {
  constructor(private readonly catalogReleases: PlatformCatalogReleaseService) {}

  @Post('bootstrap-initial')
  bootstrapInitial(@Req() request: any) { return this.catalogReleases.bootstrapInitialReleases(Number(request.user?.id)); }

  @Get()
  list() { return this.catalogReleases.list(); }

  @Post('drafts')
  createDraft(@Body() dto: CreateCatalogReleaseDto,@Req() request: any) { return this.catalogReleases.createDraft(dto,Number(request.user?.id)); }

  @Post('publish')
  publish(@Body() dto: PublishCatalogReleaseDto,@Req() request: any) { return this.catalogReleases.publish(dto.releaseId,Number(request.user?.id)); }

  @Post('retire')
  retire(@Body() dto: RetireCatalogReleaseDto,@Req() request: any) { return this.catalogReleases.retire(dto.releaseId,dto.reason,Number(request.user?.id)); }
}
