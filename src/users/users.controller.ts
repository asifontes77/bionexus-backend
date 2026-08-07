import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  UseInterceptors,
  UseGuards,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUsersDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtUserGuard } from './jwt-user.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

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

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.create')
  @Post('/insert')
  createUser(@Body() newUser: CreateUsersDto) {
    return this.usersService.createUser(newUser);
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
  @Get('/verifypassword/:id/:passwordSignature')
  verifySignature(
    @Param('id', ParseIntPipe) id: number,
    @Param('passwordSignature') passwordSignature: string,
  ) {
    return this.usersService.verifySignature(id, passwordSignature);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.update')
  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, user);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.update')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/images',
        filename: function (req, file, cb) {
          const filename = file.originalname;
          cb(null, filename);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return file.filename;
  }
}
