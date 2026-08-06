import { Module } from '@nestjs/common';
import { ExamGroupController } from './examgroup.controller';
import { ExamGroupService } from './examgroup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examgroup } from './examgroup.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Examgroup]), UsersModule],
  controllers: [ExamGroupController],
  providers: [ExamGroupService],
})
export class ExamGroupModule {}
