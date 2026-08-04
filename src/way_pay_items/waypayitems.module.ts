import { Module } from '@nestjs/common';
import { WaypayitemsController } from './waypayitems.controller';
import { WaypayitemsService } from './waypayitems.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waypayitems } from './waypayitems.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waypayitems]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [WaypayitemsController],
  providers: [WaypayitemsService, JwtStrategy],
})
export class WaypayitemsModule {}
