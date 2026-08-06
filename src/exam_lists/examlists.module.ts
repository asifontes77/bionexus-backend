import { Module } from '@nestjs/common';
import { ExamListsController } from './examlists.controller';
import { ExamListsService } from './examlists.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examlists } from './examlists.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Examlists]), UsersModule],
  controllers: [ExamListsController],
  providers: [ExamListsService],
})
export class ExamListsModule {}
