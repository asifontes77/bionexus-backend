import { TypePaymentPermissions1786665600000 } from '../migrations/1786665600000-TypePaymentPermissions';

describe('TypePaymentPermissions1786665600000', () => {
  it('crea cuatro permisos y los asigna al rol admin', async () => {
    const query = jest.fn();
    await new TypePaymentPermissions1786665600000().up({ query } as never);
    const sql = query.mock.calls.map((call) => String(call[0])).join(' ');
    expect(sql).toContain('typepayment.read');
    expect(sql).toContain('typepayment.create');
    expect(sql).toContain('typepayment.update');
    expect(sql).toContain('typepayment.change-status');
    expect(sql).toContain("role.code = 'admin'");
  });

  it('revierte asignaciones antes de eliminar permisos', async () => {
    const query = jest.fn();
    await new TypePaymentPermissions1786665600000().down({ query } as never);
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0][0])).toContain('security_role_permissions');
    expect(String(query.mock.calls[1][0])).toContain('security_permissions');
  });
});
