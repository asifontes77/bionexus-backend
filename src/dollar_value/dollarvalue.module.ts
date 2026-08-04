import { Module } from '@nestjs/common';
import { DollarvalueController } from './dollarvalue.controller';
import { DollarvalueService } from './dollarvalue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dollarvalue } from './dollarvalue.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Dollarvalue])
      ],
      controllers: [DollarvalueController],
      providers: [DollarvalueService],
})
export class DollarvalueModule {}
