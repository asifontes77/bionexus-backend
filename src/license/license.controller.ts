import { Controller, Post, Body } from '@nestjs/common';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post()
  getLicenseKey(@Body() body: {
    rif: string;
    businessName: string;
  })  {
    return this.licenseService.generateLicenseKey(
      body.rif,
      body.businessName
    );
  }
}
