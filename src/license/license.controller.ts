import { Body, Controller, Patch } from '@nestjs/common';
import { ActivateLicenseDto } from './dto/activate-license.dto';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Patch('activate')
  activateLicense(@Body() body: ActivateLicenseDto) {
    return this.licenseService.activateLicense(body);
  }
}
