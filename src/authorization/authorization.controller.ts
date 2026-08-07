import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { JwtUserGuard } from '../users/jwt-user.guard';

interface AuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
}

@Controller('authorization')
export class AuthorizationController {
  constructor(
    private readonly authorizationService: AuthorizationService,
  ) {}

  @UseGuards(JwtUserGuard)
  @Get('me')
  async getCurrentContext(
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = request.user?.userId;

    if (
      !Number.isInteger(userId) ||
      userId === undefined ||
      userId <= 0
    ) {
      throw new ForbiddenException(
        'AUTHORIZATION_CONTEXT_UNAVAILABLE',
      );
    }

    const context =
      await this.authorizationService.resolveContext(userId);

    if (!context) {
      throw new ForbiddenException(
        'AUTHORIZATION_CONTEXT_UNAVAILABLE',
      );
    }

    return context;
  }
}
