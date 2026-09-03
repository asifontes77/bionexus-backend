import { Module } from '@nestjs/common';
import { ListGermsController } from './list_germs.controller';
import { ListGermsService } from './list_germs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { listGerms } from './list_germs.entity';


import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
@Module({
  imports: [TypeOrmModule.forFeature([listGerms]), AuthorizationModule],
  controllers: [ListGermsController],
  providers: [ListGermsService],
})
export class ListGermsModule {}
