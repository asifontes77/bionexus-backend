import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { UpdateLaboratoryDto } from './dto/update-laboratorio.dto';
import { LaboratoryService } from './laboratory.service';

@Controller('laboratory')
export class LaboratoryController {
  constructor(private laboratoryService: LaboratoryService) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.read')
  @Get(':id')
  getLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.laboratoryService.getPublicLaboratory(id);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.update')
  @Patch(':id')
  updateLaboratory(
    @Param('id', ParseIntPipe) id: number,
    @Body() laboratory: UpdateLaboratoryDto,
  ) {
    return this.laboratoryService.updateLaboratory(id, laboratory);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.read')
  @Get()
  getLaboratorySetting() {
    return this.laboratoryService.getPublicLaboratorySetting();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.upload-logo')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(extension)) {
          callback(new BadRequestException('LABORATORY_LOGO_TYPE_INVALID'), false);
          return;
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: './public/images',
        filename: (_request, file, callback) => {
          callback(null, `logo_lab${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('LABORATORY_LOGO_REQUIRED');
    }
    try {
      return await this.laboratoryService.updateLaboratory(1, {
        logo: file.filename,
      });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }
}
