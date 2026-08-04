import { Module } from '@nestjs/common';
import { WaypayController } from './waypay.controller';
import { WaypayService } from './waypay.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waypay } from './waypay.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waypay])
  ],
  controllers: [WaypayController],
  providers: [WaypayService],
  exports: [WaypayService],
})
export class WaypayModule {}
