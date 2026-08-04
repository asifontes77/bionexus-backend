import { Module } from '@nestjs/common';
import { SpecialTestItemsService } from './special_test_items.service';
import { SpecialtestItemsController } from './special_test_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { special_test_items } from './special_test_items.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([special_test_items]), 
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h'},
    })
  ],
  controllers: [SpecialtestItemsController],
  providers: [SpecialTestItemsService, JwtStrategy]
})
export class SpecialTestItemsModule {}