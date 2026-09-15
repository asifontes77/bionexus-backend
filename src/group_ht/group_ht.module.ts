import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { GroupHtController } from './group_ht.controller';
import { Groupht } from './group_ht.entity';
import { GroupHtService } from './group_ht.service';

@Module({ imports: [AuthorizationModule, TypeOrmModule.forFeature([Groupht])], controllers: [GroupHtController], providers: [GroupHtService] })
export class GroupHtModule {}
