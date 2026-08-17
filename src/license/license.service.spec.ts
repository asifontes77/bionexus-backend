import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Laboratory } from '../laboratory/laboratory.entity';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { LicenseService } from './license.service';

describe('LicenseService', () => {
  let service: LicenseService;
  let getLaboratory: jest.Mock;
  let updateLaboratory: jest.Mock;

  const laboratory = {
    id: 1,
    rif: 'J-12345678-9',
    business_name: 'Laboratorio Bio Nexus',
  } as Laboratory;

  beforeEach(() => {
    getLaboratory = jest.fn();
    updateLaboratory = jest.fn();

    const laboratoryService = {
      getLaboratory,
      updateLaboratory,
    } as unknown as LaboratoryService;

    service = new LicenseService(laboratoryService);
  });

  it('normaliza el RIF y la razon social al validar', async () => {
    const validLicense = await bcrypt.hash('J123456789-LaboratorioBioNexus', 4);

    await expect(
      service.validateLicenseKey(
        laboratory.rif,
        laboratory.business_name,
        validLicense,
      ),
    ).resolves.toBe(true);
  });

  it('rechaza una licencia vacia', async () => {
    await expect(
      service.activateLicense({ license: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(getLaboratory).not.toHaveBeenCalled();
    expect(updateLaboratory).not.toHaveBeenCalled();
  });

  it('rechaza una licencia invalida', async () => {
    getLaboratory.mockResolvedValue(laboratory);
    jest.spyOn(service, 'validateLicenseKey').mockResolvedValue(false);

    await expect(
      service.activateLicense({ license: 'invalid-license' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(updateLaboratory).not.toHaveBeenCalled();
  });

  it('rechaza un laboratorio inexistente', async () => {
    getLaboratory.mockResolvedValue(null);

    await expect(
      service.activateLicense({ license: 'license-value' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(updateLaboratory).not.toHaveBeenCalled();
  });

  it('actualiza solamente la licencia cuando es valida', async () => {
    getLaboratory.mockResolvedValue(laboratory);
    updateLaboratory.mockResolvedValue({
      ...laboratory,
      license: 'valid-license',
    });

    jest.spyOn(service, 'validateLicenseKey').mockResolvedValue(true);

    await expect(
      service.activateLicense({ license: ' valid-license ' }),
    ).resolves.toEqual({ activated: true });

    expect(getLaboratory).toHaveBeenCalledWith(1);
    expect(updateLaboratory).toHaveBeenCalledTimes(1);
    expect(updateLaboratory).toHaveBeenCalledWith(1, {
      license: 'valid-license',
    });
  });
});
