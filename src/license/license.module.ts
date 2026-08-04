import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { MulterModule } from '@nestjs/platform-express'
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads', // Ruta donde se almacenarán los archivos cargados
    }),
  ],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService]
})
export class LicenseModule {}
