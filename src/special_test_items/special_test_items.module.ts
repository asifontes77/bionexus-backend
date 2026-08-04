import { Module } from '@nestjs/common';
import { SpecialTestItemsService } from './special_test_items.service';
import { SpecialtestItemsController } from './special_test_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { special_test_items } from './special_test_items.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([special_test_items]), 
    UsersModule
  ],
  controllers: [SpecialtestItemsController],
  providers: [SpecialTestItemsService]
})
export class SpecialTestItemsModule {}
