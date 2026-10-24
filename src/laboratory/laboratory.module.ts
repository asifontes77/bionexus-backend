import { Module } from '@nestjs/common';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Laboratory } from './laboratory.entity';
import { LaboratoryBranch } from './laboratory-branch.entity';
import { MulterModule } from '@nestjs/platform-express';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    SecurityAuditModule,
    MulterModule.register({
      dest: './uploads', // Ruta donde se almacenarán los archivos cargados
    }),
    TypeOrmModule.forFeature([Laboratory, LaboratoryBranch]),
  ],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}
