import { resolveProvisionLaboratoryInput } from './provision-laboratory';

describe('resolveProvisionLaboratoryInput', () => {
  const environment = {
    BIONEXUS_PROVISION_OWNER_USERNAME: ' Owner.Admin ',
    BIONEXUS_PROVISION_RIF: 'J-12345678-9',
    BIONEXUS_PROVISION_NAME: 'Laboratorio Piloto',
    BIONEXUS_PROVISION_BUSINESS_NAME: 'Laboratorio Piloto, C.A.',
    BIONEXUS_PROVISION_ADDRESS: 'Direccion piloto',
    BIONEXUS_PROVISION_BRANCH_CODE: 'PRI',
    BIONEXUS_PROVISION_BRANCH_NAME: 'Principal',
    BIONEXUS_PROVISION_ADMIN_NAME: 'Administrador Piloto',
    BIONEXUS_PROVISION_ADMIN_USERNAME: 'admin.piloto',
    BIONEXUS_PROVISION_ADMIN_PASSWORD: 'ClaveTemporal1!',
    BIONEXUS_PROVISION_SEED_PACKAGES: ' microbiology, parasitology, microbiology ',
  };

  it('normaliza el propietario y conserva el DTO para que el servicio aplique las reglas funcionales', () => {
    const input = resolveProvisionLaboratoryInput(environment);
    expect(input.platformOwnerUsername).toBe('owner.admin');
    expect(input.dto.seedPackages).toEqual(['microbiology', 'parasitology', 'microbiology']);
    expect(input.dto.administratorPasswordConfirmation).toBe(environment.BIONEXUS_PROVISION_ADMIN_PASSWORD);
  });

  it('rechaza variables obligatorias ausentes sin mostrar secretos', () => {
    expect(() => resolveProvisionLaboratoryInput({ ...environment, BIONEXUS_PROVISION_RIF: ' ' }))
      .toThrow('BIONEXUS_PROVISION_RIF_REQUIRED');
  });
});
