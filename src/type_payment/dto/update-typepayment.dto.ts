import { PaymentMethodFieldInputDto } from './payment-method-field-input.dto';

export class UpdateTypepaymantDto {
  code?: string;
  description?: string;
  displayOrder?: number;
  annulled?: boolean;
  currencyIds?: number[];
  defaultCurrencyId?: number;
  fields?: PaymentMethodFieldInputDto[];
}
