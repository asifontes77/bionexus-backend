import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { ParasiticformsController } from './parasiticforms.controller';
import { Parasiticforms } from './parasiticforms.entity';
import { ParasiticformsService } from './parasiticforms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parasiticforms]),
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [ParasiticformsController],
  providers: [ParasiticformsService],
})
export class ParasiticformsModule {}
