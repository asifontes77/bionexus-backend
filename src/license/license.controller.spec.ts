import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';

describe('LicenseController', () => {
  let controller: LicenseController;
  let activateLicense: jest.Mock;

  beforeEach(() => {
    activateLicense = jest.fn();

    const licenseService = {
      activateLicense,
    } as unknown as LicenseService;

    controller = new LicenseController(licenseService);
  });

  it('delega la activacion al servicio', async () => {
    activateLicense.mockResolvedValue({ activated: true });

    await expect(
      controller.activateLicense({ license: 'license-value' }),
    ).resolves.toEqual({ activated: true });

    expect(activateLicense).toHaveBeenCalledTimes(1);
    expect(activateLicense).toHaveBeenCalledWith({
      license: 'license-value',
    });
  });
});
