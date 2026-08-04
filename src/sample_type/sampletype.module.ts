import { Module } from '@nestjs/common';
import { SampletypeController } from './sampletype.controller';
import { SampleTypeService } from './sampletype.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SampleType } from './sampletype.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([SampleType]),
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [SampletypeController],
    providers: [SampleTypeService, JwtStrategy]
  })
  export class SampleTypeModule {}