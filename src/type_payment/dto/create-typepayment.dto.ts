export class CreateTypepaymantDto {
  code: string;
  description: string;
  displayOrder?: number;
  currencyIds: number[];
  defaultCurrencyId: number;
}
