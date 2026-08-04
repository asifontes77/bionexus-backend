import { Module } from '@nestjs/common';
import { ListGermsController } from './list_germs.controller';
import { ListGermsService } from './list_germs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { listGerms } from './list_germs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([listGerms])
  ],
  controllers: [ListGermsController],
  providers: [ListGermsService]
})
export class ListGermsModule {}
