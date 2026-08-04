import { Module } from '@nestjs/common';
import { GroupHtController } from './group_ht.controller';
import { GroupHtService } from './group_ht.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Groupht } from './group_ht.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Groupht]),
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [GroupHtController],
  providers: [GroupHtService, JwtStrategy],
})
export class GroupHtModule {}
