import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformController } from './platform.controller';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { PlatformProvisioningService } from './platform-provisioning.service';
@Module({imports:[UsersModule],controllers:[PlatformAuthController,PlatformController],providers:[PlatformOwnerGuard,PlatformProvisioningService]})
export class PlatformModule {}
