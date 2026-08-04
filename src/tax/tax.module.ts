import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from './tax.entity'
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Tax]), 
      UsersModule
    ],
    controllers: [TaxController],
    providers: [TaxService]
  })
  export class TaxModule {}
