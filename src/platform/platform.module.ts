import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { UsersModule } from '../users/users.module';
@Module({ imports:[UsersModule], controllers:[PlatformAuthController, PlatformController], providers:[PlatformOwnerGuard] })
export class PlatformModule {}
