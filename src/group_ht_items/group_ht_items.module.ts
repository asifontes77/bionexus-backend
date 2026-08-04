import { Module } from '@nestjs/common';
import { GroupHtItemsService } from './group_h_itemst.service';
import { GroupHtItemsController } from './group_ht_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grouphtitems } from './group_ht_items.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Grouphtitems]), 
      UsersModule
    ],
    controllers: [GroupHtItemsController],
    providers: [GroupHtItemsService]
  })
  export class GroupHtItemsModule {}
