import { Controller, Get, Param, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { join } from 'path';

@Controller('public')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':filePath*')
  servePublicFile(@Param('filePath') filePath: string, @Res() response: Response) {
    const file = join(__dirname, '..', 'public', filePath);
    response.sendFile(file);
  }
}
