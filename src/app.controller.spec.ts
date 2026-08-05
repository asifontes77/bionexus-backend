import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('servePublicFile', () => {
    it('debe enviar el archivo solicitado desde el directorio public', () => {
      const response = {
        sendFile: jest.fn(),
      } as unknown as Response;

      appController.servePublicFile('assets/example.txt', response);

      expect(response.sendFile).toHaveBeenCalledTimes(1);
      expect(response.sendFile).toHaveBeenCalledWith(
        join(__dirname, '..', 'public', 'assets/example.txt'),
      );
    });
  });
});
