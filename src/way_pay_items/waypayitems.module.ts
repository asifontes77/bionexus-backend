import { Module } from '@nestjs/common';
import { WaypayitemsController } from './waypayitems.controller';
import { WaypayitemsService } from './waypayitems.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waypayitems } from './waypayitems.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waypayitems])
  ],
  controllers: [WaypayitemsController],
  providers: [WaypayitemsService],
})
export class WaypayitemsModule {}
