import { Module } from '@nestjs/common';
import { ExamGroupController } from './examgroup.controller';
import { ExamGroupService } from './examgroup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examgroup } from './examgroup.entity'
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Examgroup]), 
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h'},
    })
  ],
  controllers: [ExamGroupController],
  providers: [ExamGroupService, JwtStrategy]
})
export class ExamGroupModule {}
