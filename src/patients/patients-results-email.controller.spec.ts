jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

jest.mock('node-thermal-printer', () => ({
  ThermalPrinter: jest.fn(),
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

describe('PatientsController results email candidates', () => {
  const getPatientResultsEmailCandidates = jest.fn();
  const controller = new PatientsController({ getPatientResultsEmailCandidates } as unknown as PatientsService);

  beforeEach(() => jest.clearAllMocks());

  it('delega el rango al servicio', async () => {
    getPatientResultsEmailCandidates.mockResolvedValue([{ id: 1 }]);
    await expect(controller.getPatientResultsEmailCandidates('2026-08-01', '2026-08-31')).resolves.toEqual([{ id: 1 }]);
    expect(getPatientResultsEmailCandidates).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
  });

  it('exige JWT, PermissionGuard y permiso de lectura', () => {
    const method = PatientsController.prototype.getPatientResultsEmailCandidates;
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([JwtUserGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual(['patient-results-email.read']);
  });
});
