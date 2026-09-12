import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentItemFieldValue } from './payment-item-field-value.entity';
import { WaypayitemsController } from './waypayitems.controller';
import { Waypayitems } from './waypayitems.entity';
import { WaypayitemsService } from './waypayitems.service';

@Module({ imports:[TypeOrmModule.forFeature([Waypayitems,PaymentItemFieldValue])],controllers:[WaypayitemsController],providers:[WaypayitemsService],exports:[TypeOrmModule] })
export class WaypayitemsModule {}
