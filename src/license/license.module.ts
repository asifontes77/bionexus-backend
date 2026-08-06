import { Module } from '@nestjs/common';
import { LaboratoryModule } from '../laboratory/laboratory.module';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';

@Module({
  imports: [LaboratoryModule],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
