import { PaymentFieldType } from '../payment-method-field.entity';

export class PaymentMethodFieldInputDto {
  code?: string;
  label: string;
  fieldType: PaymentFieldType;
  isRequired?: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  inputMask?: string | null;
  validationPattern?: string | null;
  helpText?: string | null;
  catalogSource?: string | null;
  isActive?: boolean;
}
