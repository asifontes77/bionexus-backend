import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export type FinancialCurrencyLockReason =
  | 'tariff_prices'
  | 'admissions'
  | 'payments'
  | 'invoices'
  | 'receivables'
  | 'credit_notes'
  | 'cash_closures';

const DETECTORS: ReadonlyArray<{ reason: FinancialCurrencyLockReason; sql: string }> = [
  { reason: 'tariff_prices', sql: 'SELECT EXISTS(SELECT 1 FROM exam_tariff_prices WHERE laboratory_id=$1) AS exists' },
  { reason: 'admissions', sql: 'SELECT EXISTS(SELECT 1 FROM patient_admissions WHERE laboratory_id=$1) AS exists' },
  { reason: 'payments', sql: 'SELECT EXISTS(SELECT 1 FROM way_pay WHERE laboratory_id=$1) AS exists' },
  { reason: 'invoices', sql: 'SELECT EXISTS(SELECT 1 FROM invoice WHERE laboratory_id=$1) AS exists' },
  { reason: 'receivables', sql: 'SELECT EXISTS(SELECT 1 FROM customer_accounts_receivable WHERE laboratory_id=$1) AS exists' },
  { reason: 'credit_notes', sql: "SELECT EXISTS(SELECT 1 FROM patient_admissions WHERE laboratory_id=$1 AND btrim(coalesce(creditnote,''))<>'') AS exists" },
  { reason: 'cash_closures', sql: 'SELECT EXISTS(SELECT 1 FROM cash_register WHERE laboratory_id=$1) AS exists' },
];

@Injectable()
export class FinancialPrimaryCurrencyGuardService {
  async assertChangeAllowed(manager: EntityManager, laboratoryId: number): Promise<void> {
    const reasons: FinancialCurrencyLockReason[] = [];
    for (const detector of DETECTORS) {
      const rows = await manager.query(detector.sql, [laboratoryId]) as Array<{ exists: boolean | string | number }>;
      const value = rows[0]?.exists;
      if (value === true || value === 1 || value === '1' || value === 't' || value === 'true') reasons.push(detector.reason);
    }
    if (reasons.length) throw new BadRequestException({
      code: 'APPLICATION_SETTINGS_FINANCIAL_CURRENCY_LOCKED',
      reasons,
    });
  }
}
