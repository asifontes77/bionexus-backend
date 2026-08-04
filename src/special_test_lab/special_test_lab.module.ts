import { Module } from '@nestjs/common';
import { SpecialtestlabController } from './special_test_lab.controller';
import { SpecialTestLabService } from './special_test_lab.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { special_test_lab } from './special_test_lab.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([special_test_lab]), 
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h'},
    })
  ],
  controllers: [SpecialtestlabController],
  providers: [SpecialTestLabService, JwtStrategy]
})
export class SpecialTestLabModule {}