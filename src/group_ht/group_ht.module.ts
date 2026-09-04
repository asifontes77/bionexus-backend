import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { Grouphtitems } from '../group_ht_items/group_ht_items.entity';
import { GroupHtController } from './group_ht.controller';
import { Groupht } from './group_ht.entity';
import { GroupHtService } from './group_ht.service';
@Module({
  imports: [
    AuthorizationModule,
    SecurityAuditModule,
    TypeOrmModule.forFeature([Groupht, Grouphtitems]),
  ],
  controllers: [GroupHtController],
  providers: [GroupHtService],
})
export class GroupHtModule {}
