import { PaymentMethodFieldInputDto } from './payment-method-field-input.dto';

export class CreateTypepaymantDto {
  code: string;
  description: string;
  displayOrder?: number;
  currencyIds: number[];
  defaultCurrencyId: number;
  fields?: PaymentMethodFieldInputDto[];
}
