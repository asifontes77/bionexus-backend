import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlatformOwnerLoginDto } from './dto/platform-owner-login.dto';

@Controller('platform')
export class PlatformAuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('session')
  login(@Body() payload: PlatformOwnerLoginDto) {
    const username = typeof payload?.username === 'string' ? payload.username.trim() : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';
    if (!username || !password || username.length > 100 || password.length > 200) {
      throw new BadRequestException('INVALID_ADMIN_LOGIN_PAYLOAD');
    }
    return this.usersService.getPlatformOwnerSession(username, password);
  }
}
