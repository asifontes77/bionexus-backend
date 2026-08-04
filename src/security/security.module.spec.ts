import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SecurityModule } from './security.module';

describe('SecurityModule', () => {
  let module: TestingModule;
  let jwtService: JwtService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [
            () => ({
              SECRET: 'test-secret',
            }),
          ],
        }),
        SecurityModule,
      ],
    }).compile();

    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('debe firmar y verificar un payload correctamente', () => {
    const payload = { id: 1, name: 'TestUser' };

    const token = jwtService.sign(payload);
    expect(token).toBeDefined();

    const decoded = jwtService.verify(token);
    expect(decoded.id).toEqual(payload.id);
    expect(decoded.name).toEqual(payload.name);
  });

  it('debe fallar si SECRET no está configurada', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            ignoreEnvVars: true,
          }),
          SecurityModule,
        ],
      }).compile()
    ).rejects.toThrow('The SECRET environment variable is required.');
  });
});