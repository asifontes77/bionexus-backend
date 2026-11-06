import { BadRequestException } from '@nestjs/common';
import { FinancialPrimaryCurrencyGuardService } from './financial-primary-currency-guard.service';

describe('FinancialPrimaryCurrencyGuardService', () => {
  it('allows the change when every persisted monetary category is empty', async () => {
    const manager = { query: jest.fn().mockResolvedValue([{ exists: false }]) };
    await expect(new FinancialPrimaryCurrencyGuardService().assertChangeAllowed(manager as never, 8)).resolves.toBeUndefined();
    expect(manager.query).toHaveBeenCalledTimes(7);
    expect(manager.query.mock.calls.every((call) => call[1][0] === 8)).toBe(true);
  });

  it('returns only blocking categories and never row data', async () => {
    const manager = { query: jest.fn()
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: false }])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValue([{ exists: false }]) };
    try {
      await new FinancialPrimaryCurrencyGuardService().assertChangeAllowed(manager as never, 8);
      throw new Error('EXPECTED_LOCK');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(response).toEqual({ code: 'APPLICATION_SETTINGS_FINANCIAL_CURRENCY_LOCKED', reasons: ['tariff_prices', 'payments'] });
      expect(JSON.stringify(response)).not.toMatch(/amount|patient|invoiceId|row/i);
    }
  });
});
