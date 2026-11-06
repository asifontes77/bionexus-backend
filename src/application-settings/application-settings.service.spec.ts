import { ApplicationSettingsService } from './application-settings.service';

describe('ApplicationSettingsService currency guard', () => {
  const row = { id: 4, laboratory_id: 8, financial_primary_currency_id: 2, session_timeout_minutes: 30, inactivity_timeout_minutes: 20, countdown_seconds: 120 };
  function setup(guard = { assertChangeAllowed: jest.fn() }) {
    const repository = { findOne: jest.fn().mockResolvedValue({ ...row }), save: jest.fn(async (value) => value) };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
    const audit = { write: jest.fn() };
    const service = new ApplicationSettingsService({} as never, dataSource as never, audit as never, undefined, guard as never);
    return { service, guard, repository, audit };
  }

  it('does not invoke the guard when the primary currency does not change', async () => {
    const { service, guard, repository } = setup();
    await service.update(8, { financial_primary_currency_id: 2 }, 70);
    expect(guard.assertChangeAllowed).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('invokes the guard inside the transaction before saving a different currency', async () => {
    const { service, guard, repository } = setup();
    await service.update(8, { financial_primary_currency_id: 3 }, 70);
    expect(guard.assertChangeAllowed).toHaveBeenCalledWith(expect.anything(), 8);
    expect(guard.assertChangeAllowed.mock.invocationCallOrder[0]).toBeLessThan(repository.save.mock.invocationCallOrder[0]);
  });

  it('does not save or audit when the guard blocks the change', async () => {
    const blocking = { assertChangeAllowed: jest.fn().mockRejectedValue(new Error('APPLICATION_SETTINGS_FINANCIAL_CURRENCY_LOCKED')) };
    const { service, repository, audit } = setup(blocking);
    await expect(service.update(8, { financial_primary_currency_id: 3 }, 70)).rejects.toThrow('APPLICATION_SETTINGS_FINANCIAL_CURRENCY_LOCKED');
    expect(repository.save).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });
});
