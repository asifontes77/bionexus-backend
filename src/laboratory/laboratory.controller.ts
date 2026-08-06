import {
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
import { diskStorage } from 'multer';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { UpdateLaboratoryDto } from './dto/update-laboratorio.dto';
import { LaboratoryService } from './laboratory.service';

@Controller('laboratory')
export class LaboratoryController {
  constructor(private laboratoryService: LaboratoryService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.laboratoryService.getPublicLaboratory(id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateLaboratory(
    @Param('id', ParseIntPipe) id: number,
    @Body() laboratory: UpdateLaboratoryDto,
  ) {
    return this.laboratoryService.updateLaboratory(id, laboratory);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getLaboratorySetting() {
    return this.laboratoryService.getPublicLaboratorySetting();
  }

  @UseGuards(JwtUserGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/images',
        filename: function (req, file, cb) {
          cb(null, 'logo_lab.' + file.originalname.split('.')[1]);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const id = 1;
    const change = {
      logo: file.filename,
    };

    return this.laboratoryService.updateLaboratory(id, change);
  }
}
