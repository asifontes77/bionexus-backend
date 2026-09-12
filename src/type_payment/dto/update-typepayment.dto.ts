export class UpdateTypepaymantDto {
  code?: string;
  description?: string;
  displayOrder?: number;
  annulled?: boolean;
  currencyIds?: number[];
  defaultCurrencyId?: number;
}
