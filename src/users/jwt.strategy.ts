import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('SECRET');

    if (!secret) {
      throw new Error('The SECRET environment variable is required.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const identityType = payload.identityType ?? 'tenant-user';
    const laboratoryId = Number(payload.laboratoryId);
    if (identityType !== 'platform-owner' && (!Number.isInteger(laboratoryId) || laboratoryId <= 0)) {
      return null;
    }
    return {
      userId: payload.id,
      username: payload.name,
      identityType,
      laboratoryId: identityType === 'platform-owner' ? undefined : laboratoryId,
    };
  }
}
