import { Module } from '@nestjs/common';
import { InvoiceitemsController } from './invoiceitems.controller';
import { InvoiceitemsService } from './invoiceitems.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoiceitems } from './invoiceitems.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';

@Module({
    imports: [
    TypeOrmModule.forFeature([Invoiceitems]),
        JwtModule.register({
          secret: jwtConstants.secret,
          signOptions: { expiresIn: '20h'},
        })
      ],
      controllers: [ InvoiceitemsController],
      providers: [InvoiceitemsService, JwtStrategy]
  })
  export class InvoiceitemsModule {}
  