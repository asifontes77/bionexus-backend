import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './client.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Client]), 
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [ClientController],
    providers: [ClientService, JwtStrategy]
  })
  export class ClientModule {}