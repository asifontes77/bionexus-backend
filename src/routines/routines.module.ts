import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Routines } from './routines.entity';
import { ExamRoutineItem } from './exam-routine-item.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Routines, ExamRoutineItem]), UsersModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
