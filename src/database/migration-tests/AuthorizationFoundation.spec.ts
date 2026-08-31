import { QueryRunner } from 'typeorm';
import { AuthorizationFoundation1786060800000 } from '../migrations/1786060800000-AuthorizationFoundation';

describe('AuthorizationFoundation1786060800000 clean installation', () => {
  it('allows an empty users table and creates the authorization catalog', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('users_total'))
        return [{ users_total: 0, administrators_total: 0 }];
      if (sql.includes('COUNT(DISTINCT user_role.user_id)'))
        return [{ total: 0 }];
      return [];
    });
    await expect(
      new AuthorizationFoundation1786060800000().up({
        query,
      } as unknown as QueryRunner),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE security_roles'),
    );
  });

  it('rejects an existing legacy installation without an administrator', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([{ users_total: 2, administrators_total: 0 }]);
    await expect(
      new AuthorizationFoundation1786060800000().up({
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow(
      'Authorization migration requires at least one legacy admin user when users already exist.',
    );
  });

  it('preserves legacy administrator normalization', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('users_total'))
        return [{ users_total: 2, administrators_total: 1 }];
      if (sql.includes('COUNT(DISTINCT user_role.user_id)'))
        return [{ total: 1 }];
      return [];
    });
    await expect(
      new AuthorizationFoundation1786060800000().up({
        query,
      } as unknown as QueryRunner),
    ).resolves.toBeUndefined();
  });
});
