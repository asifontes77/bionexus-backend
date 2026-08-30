import { existsSync } from 'node:fs';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  HttpException,
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  Req,
  UseInterceptors,
  UseGuards,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUsersDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtUserGuard } from './jwt-user.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('/list')
  getUsers() {
    return this.usersService.getUsers();
  }
  @UseGuards(JwtUserGuard)
  @Get('/listsignature')
  getSignatureUsers() {
    return this.usersService.getSignatureUsers();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('/order')
  getUsersOrder() {
    return this.usersService.getUsersOrder();
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUser(id);
  }

  @Post('/session')
  getUserSession(@Body() userLogin: LoginUserDto) {
    return this.usersService.getUserSession(userLogin);
  }

  @UseGuards(JwtUserGuard)
  @Post('/session/renew')
  renewUserSession(@Req() request: SecurityAuthenticatedRequest) {
    const userId = getSecurityAuditActorUserId(request);
    if (userId === null) {
      throw new BadRequestException('AUTHENTICATED_USER_REQUIRED');
    }
    return this.usersService.renewUserSession(userId);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.create')
  @Post('/insert')
  createUser(
    @Body() newUser: CreateUsersDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.usersService.createUser(newUser)
      : this.usersService.createUser(newUser, actorUserId);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.update')
  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('/verify/:email')
  verifyEmail(@Param('email') email: string) {
    return this.usersService.verifyEmail(email);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('/verify-id/:id/:email')
  verifyEmailId(
    @Param('id', ParseIntPipe) id: number,
    @Param('email') email: string,
  ) {
    return this.usersService.verifyEmailId(id, email);
  }


  @UseGuards(JwtUserGuard)
  @Post('/verify-signature')
  verifySignatureSecure(@Body() body: VerifySignatureDto) {
    return this.usersService.verifySignature(
      body.userId,
      body.passwordSignature,
    );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.update')
  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.usersService.updateUser(id, user)
      : this.usersService.updateUser(id, user, actorUserId);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.update')
  @Post(':userId/upload/:assetType')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_request, file, callback) => {
        callback(
          null,
          ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype),
        );
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assetType') assetType: string,
    @Req() request: SecurityAuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!['photos', 'signatures'].includes(assetType)) {
      throw new BadRequestException('USER_IMAGE_TYPE_INVALID');
    }
    if (!file) throw new BadRequestException('USER_IMAGE_REQUIRED');

    const user = await this.usersService.getUser(userId);
    if (user instanceof HttpException) throw user;

    const laboratoryId = 1;
    const extension = extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException('USER_IMAGE_EXTENSION_INVALID');
    }

    const directory = join(
      process.cwd(),
      'public',
      'laboratories',
      String(laboratoryId),
      'users',
      assetType,
    );
    await mkdir(directory, { recursive: true });

    const filename = `${userId}${extension}`;
    const target = join(directory, filename);
    const currentFiles = existsSync(directory) ? await readdir(directory) : [];
    for (const currentFile of currentFiles) {
      if (currentFile !== filename && currentFile.startsWith(`${userId}.`)) {
        await unlink(join(directory, currentFile));
      }
    }
    await writeFile(target, file.buffer);

    const relativePath = `laboratories/${laboratoryId}/users/${assetType}/${filename}`;
    const actorUserId = getSecurityAuditActorUserId(request);
    const changes = assetType === 'photos'
      ? { url_photo: relativePath }
      : { url_signature: relativePath };
    await this.usersService.updateUser(userId, changes, actorUserId ?? undefined);
    return { filename: relativePath };
  }
}
