import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../users/jwt.strategy';
import { SubscriptionModule } from '../subscription/subscription.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    SubscriptionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('SECRET');

        if (!secret) {
          throw new Error('The SECRET environment variable is required.');
        }

        return {
          secret,
        };
      },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class SecurityModule {}
