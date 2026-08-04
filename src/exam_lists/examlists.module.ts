import { Module } from '@nestjs/common';
import { ExamListsController } from './examlists.controller';
import { ExamListsService } from './examlists.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examlists } from './examlists.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Examlists]),
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [ExamListsController],
  providers: [ExamListsService, JwtStrategy],
})
export class ExamListsModule {}
