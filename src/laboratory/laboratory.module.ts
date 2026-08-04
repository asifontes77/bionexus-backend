import { Module } from '@nestjs/common';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Laboratory } from './laboratory.entity'
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { MulterModule } from '@nestjs/platform-express'

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads', // Ruta donde se almacenarán los archivos cargados
    }),
    TypeOrmModule.forFeature([Laboratory]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h'},
    })
  ],
  controllers: [LaboratoryController],
  providers: [LaboratoryService, JwtStrategy],
  exports: [LaboratoryService]
})
export class LaboratoryModule {}
