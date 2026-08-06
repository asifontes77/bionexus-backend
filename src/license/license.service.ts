import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Laboratory } from '../laboratory/laboratory.entity';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { ActivateLicenseDto } from './dto/activate-license.dto';

const DEFAULT_LABORATORY_ID = 1;

@Injectable()
export class LicenseService {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  async validateLicenseKey(
    rif: string,
    businessName: string,
    licenseKey: string,
  ): Promise<boolean> {
    const licenseData = this.createLicenseData(rif, businessName);
    return bcrypt.compare(licenseData, licenseKey);
  }

  async activateLicense(
    request: ActivateLicenseDto,
  ): Promise<{ activated: true }> {
    const license = request?.license?.trim();

    if (!license) {
      throw new BadRequestException('LICENSE_REQUIRED');
    }

    const laboratoryResult = await this.laboratoryService.getLaboratory(
      DEFAULT_LABORATORY_ID,
    );

    if (laboratoryResult instanceof HttpException) {
      throw laboratoryResult;
    }

    if (!laboratoryResult) {
      throw new NotFoundException('LABORATORY_NOT_FOUND');
    }

    const laboratory = laboratoryResult as Laboratory;

    const isValid = await this.validateLicenseKey(
      laboratory.rif,
      laboratory.business_name,
      license,
    );

    if (!isValid) {
      throw new ForbiddenException('INVALID_LICENSE_KEY');
    }

    const updateResult = await this.laboratoryService.updateLaboratory(
      DEFAULT_LABORATORY_ID,
      { license },
    );

    if (updateResult instanceof HttpException) {
      throw updateResult;
    }

    return { activated: true };
  }

  private createLicenseData(rif: string, businessName: string): string {
    const normalizedRif = rif.replace(/-/g, '');
    const normalizedBusinessName = businessName.replace(/\s+/g, '');

    return normalizedRif + '-' + normalizedBusinessName;
  }
}
