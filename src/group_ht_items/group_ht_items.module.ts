import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { Examlists } from '../exam_lists/examlists.entity';
import { Groupht } from '../group_ht/group_ht.entity';
import { GroupHtItemsService } from './group_h_itemst.service';
import { GroupHtItemsController } from './group_ht_items.controller';
import { Grouphtitems } from './group_ht_items.entity';
@Module({
  imports: [
    AuthorizationModule,
    SecurityAuditModule,
    TypeOrmModule.forFeature([Grouphtitems, Groupht, Examlists]),
  ],
  controllers: [GroupHtItemsController],
  providers: [GroupHtItemsService],
})
export class GroupHtItemsModule {}
