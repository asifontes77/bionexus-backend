export class CreateWaypayitemsDto {
  id_way_pay: number;
  id_type_payment: number;
  currencyId: number;
  enteredAmount: number;
  baseAmount: number;
  localEquivalentAmount: number;
  exchangeRate?: number | null;
  exchangeRateDecimalPlaces?: number | null;
  exchangeRateDate?: Date | null;
}
