import { Module } from '@nestjs/common';
import { WaypayController } from './waypay.controller';
import { WaypayService } from './waypay.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waypay } from './waypay.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waypay]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [WaypayController],
  providers: [WaypayService, JwtStrategy],
  exports: [WaypayService],
})
export class WaypayModule {}
