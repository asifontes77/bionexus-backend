import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe servir un archivo público mediante una ruta anidada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/bionexus.svg')
      .expect(200);

    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(Buffer.from(response.body).toString('utf8')).toContain('<svg');
  });

  it('debe responder 404 para la raíz del prefijo API', async () => {
    await request(app.getHttpServer()).get('/api').expect(404);
  });

  it('no debe servir contenido estático para una ruta API no registrada', async () => {
    await request(app.getHttpServer())
      .get('/api/ruta-no-registrada')
      .expect(404);
  });

  it('debe procesar una carga multipart con Multer 2', async () => {
    const fileName = `bionexus-multer--.txt`;
    const outputPath = join(process.cwd(), 'public', 'images', fileName);

    try {
      const response = await request(app.getHttpServer())
        .post('/api/users/upload')
        .attach('file', Buffer.from('Bio Nexus Multer 2'), fileName)
        .expect(201);

      expect(response.text).toBe(fileName);
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    }
  });
});
