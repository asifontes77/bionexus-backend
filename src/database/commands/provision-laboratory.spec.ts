import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { provisionLaboratoryFromEnvironment, resolveProvisionLaboratoryInput } from './provision-laboratory';

describe('resolveProvisionLaboratoryInput', () => {
  const environment = {
    BIONEXUS_PROVISION_OWNER_USERNAME: ' Owner.Admin ',
    BIONEXUS_PROVISION_ACCESS_SLUG: ' Lab A ',
    BIONEXUS_PROVISION_RIF: 'J-12345678-9',
    BIONEXUS_PROVISION_NAME: 'Laboratorio Piloto',
    BIONEXUS_PROVISION_BUSINESS_NAME: 'Laboratorio Piloto, C.A.',
    BIONEXUS_PROVISION_ADDRESS: 'Direccion piloto',
    BIONEXUS_PROVISION_PLAN_CODE: 'pilot',
    BIONEXUS_PROVISION_SUBSCRIPTION_STATUS: 'perpetual_free',
    BIONEXUS_PROVISION_SERVICE_STARTS_AT: '2026-10-30T00:00:00Z',
    BIONEXUS_PROVISION_PERPETUAL_FREE_REASON: 'Piloto oficial',
    BIONEXUS_PROVISION_BRANCH_NAME: 'Principal',
    BIONEXUS_PROVISION_ADMIN_NAME: 'Administrador Piloto',
    BIONEXUS_PROVISION_ADMIN_USERNAME: 'admin.piloto',
    BIONEXUS_PROVISION_ADMIN_PASSWORD: 'ClaveTemporal1!',
    BIONEXUS_PROVISION_SEED_PACKAGES: ' microbiology, parasitology, microbiology ',
  };

  it('normaliza el propietario y conserva el DTO para que el servicio aplique las reglas funcionales', () => {
    const input = resolveProvisionLaboratoryInput(environment);
    expect(input.platformOwnerUsername).toBe('owner.admin');
    expect(input.dto.access_slug).toBe('Lab A');
    expect(input.dto.subscription_status).toBe('perpetual_free');
    expect(input.dto.service_expires_at).toBeNull();
    expect(input.dto.branchCode).toBeUndefined();
    expect(input.dto.seedPackages).toEqual(['microbiology', 'parasitology', 'microbiology']);
    expect(input.dto.administratorPasswordConfirmation).toBe(environment.BIONEXUS_PROVISION_ADMIN_PASSWORD);
  });

  it('accepts an optional internal branch code when explicitly supplied', () => {
    const input = resolveProvisionLaboratoryInput({
      ...environment,
      BIONEXUS_PROVISION_BRANCH_CODE: ' suc ',
    });
    expect(input.dto.branchCode).toBe('suc');
  });

  it('allows perpetual-free provisioning without a catalog plan and still requires a plan for trial or active', () => {
    const perpetualFree = resolveProvisionLaboratoryInput({
      ...environment,
      BIONEXUS_PROVISION_PLAN_CODE: undefined,
    });
    expect(perpetualFree.dto.plan_code).toBeUndefined();
    expect(() => resolveProvisionLaboratoryInput({
      ...environment,
      BIONEXUS_PROVISION_PLAN_CODE: undefined,
      BIONEXUS_PROVISION_SUBSCRIPTION_STATUS: 'active',
    })).toThrow('BIONEXUS_PROVISION_PLAN_CODE_REQUIRED');
  });

  it('rechaza variables obligatorias ausentes sin mostrar secretos', () => {
    expect(() => resolveProvisionLaboratoryInput({ ...environment, BIONEXUS_PROVISION_RIF: ' ' }))
      .toThrow('BIONEXUS_PROVISION_RIF_REQUIRED');
  });

  it('espera a que termine el alta antes de cerrar el contexto de Nest', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ id: 7 }]) };
    let finishProvisioning!: (result: Record<string, unknown>) => void;
    const provisioningResult = new Promise<Record<string, unknown>>((resolve) => {
      finishProvisioning = resolve;
    });
    const provisioning = { provision: jest.fn().mockReturnValue(provisioningResult) };
    const close = jest.fn().mockResolvedValue(undefined);
    const context = {
      get: jest.fn((token: unknown) => token === DataSource ? dataSource : provisioning),
      close,
    };
    jest.spyOn(NestFactory, 'createApplicationContext').mockResolvedValue(context as never);

    const operation = provisionLaboratoryFromEnvironment(environment);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(provisioning.provision).toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    finishProvisioning({ success: true });

    await expect(operation).resolves.toEqual({ success: true });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
