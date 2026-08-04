import { Module } from '@nestjs/common';
import { SpecialtestlabController } from './special_test_lab.controller';
import { SpecialTestLabService } from './special_test_lab.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { special_test_lab } from './special_test_lab.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([special_test_lab]), 
    UsersModule
  ],
  controllers: [SpecialtestlabController],
  providers: [SpecialTestLabService]
})
export class SpecialTestLabModule {}
