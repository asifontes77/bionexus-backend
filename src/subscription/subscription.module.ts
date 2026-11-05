import { Module } from '@nestjs/common';
import { SubscriptionAccessService } from './subscription-access.service';

@Module({
  providers: [SubscriptionAccessService],
  exports: [SubscriptionAccessService],
})
export class SubscriptionModule {}
