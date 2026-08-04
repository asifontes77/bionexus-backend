import { Module } from '@nestjs/common';
import { GroupHtItemsService } from './group_h_itemst.service';
import { GroupHtItemsController } from './group_ht_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grouphtitems } from './group_ht_items.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Grouphtitems]), 
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [GroupHtItemsController],
    providers: [GroupHtItemsService, JwtStrategy]
  })
  export class GroupHtItemsModule {}