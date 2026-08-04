import { Module } from '@nestjs/common';
import { GroupHtController } from './group_ht.controller';
import { GroupHtService } from './group_ht.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Groupht } from './group_ht.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Groupht]),
    UsersModule
  ],
  controllers: [GroupHtController],
  providers: [GroupHtService],
})
export class GroupHtModule {}