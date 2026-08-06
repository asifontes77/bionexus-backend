import { Module } from '@nestjs/common';
import { InvoiceitemsController } from './invoiceitems.controller';
import { InvoiceitemsService } from './invoiceitems.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoiceitems } from './invoiceitems.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoiceitems])],
  controllers: [InvoiceitemsController],
  providers: [InvoiceitemsService],
})
export class InvoiceitemsModule {}
