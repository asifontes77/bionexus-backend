import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, unlink } from 'fs/promises';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
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
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() laboratory: UpdateLaboratoryDto,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return this.laboratoryService.updateLaboratory(
      id,
      laboratory,
      actorUserId ?? undefined,
    );
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.read')
  @Get()
  getLaboratorySetting() {
    return this.laboratoryService.getPublicLaboratorySetting();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('laboratory.upload-logo')
  @Post(':id/upload')
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
        destination: async (request, _file, callback) => {
          const laboratoryId = Number(request.params.id);
          if (!Number.isInteger(laboratoryId) || laboratoryId <= 0) {
            callback(new BadRequestException('LABORATORY_ID_INVALID'), '');
            return;
          }
          const destination = join('public', 'laboratories', String(laboratoryId), 'identity');
          try {
            await mkdir(destination, { recursive: true });
            callback(null, destination);
          } catch (error) {
            callback(error as Error, destination);
          }
        },
        filename: (_request, file, callback) => {
          callback(null, `logo_lab${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Req() request: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('LABORATORY_LOGO_REQUIRED');
    }
    try {
      const actorUserId = getSecurityAuditActorUserId(request);
      return await this.laboratoryService.updateLaboratory(
        id,
        { logo: `laboratories/${id}/identity/${file.filename}` },
        actorUserId ?? undefined,
        'laboratory.logo.updated',
      );
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }
}
