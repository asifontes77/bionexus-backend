import { Module } from '@nestjs/common';
import { ListGermsController } from './list_germs.controller';
import { ListGermsService } from './list_germs.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { listGerms } from './list_germs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([listGerms]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [ListGermsController],
  providers: [ListGermsService, JwtStrategy]
})
export class ListGermsModule {}
