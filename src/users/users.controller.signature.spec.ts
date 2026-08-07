import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtUserGuard } from './jwt-user.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController signature verification', () => {
  let controller: UsersController;
  let verifySignature: jest.Mock;

  beforeEach(() => {
    verifySignature = jest.fn();

    controller = new UsersController({
      verifySignature,
    } as unknown as UsersService);
  });

  it('delega la clave recibida en el cuerpo', async () => {
    verifySignature.mockResolvedValue({
      user: {
        id: 7,
        name: 'Usuario autorizado',
        college_number: 'BIO-123',
      },
    });

    await expect(
      controller.verifySignatureSecure({
        userId: 7,
        passwordSignature: 'signature-value',
      }),
    ).resolves.toEqual({
      user: {
        id: 7,
        name: 'Usuario autorizado',
        college_number: 'BIO-123',
      },
    });

    expect(verifySignature).toHaveBeenCalledWith(
      7,
      'signature-value',
    );
  });

  it('registra el endpoint seguro como POST', () => {
    const method =
      UsersController.prototype.verifySignatureSecure;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('/verify-signature');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.POST);
  });

  it('protege el endpoint seguro con JwtUserGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UsersController.prototype.verifySignatureSecure,
    );

    expect(guards).toContain(JwtUserGuard);
  });

  it('mantiene temporalmente el endpoint legacy', () => {
    const method =
      UsersController.prototype.verifySignature;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('/verifypassword/:id/:passwordSignature');
  });
});
