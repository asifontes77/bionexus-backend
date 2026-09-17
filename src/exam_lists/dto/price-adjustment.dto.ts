export type PriceAdjustmentOperation = 'increase' | 'decrease';

export class PriceAdjustmentDto {
  examIds: number[];
  operation: PriceAdjustmentOperation;
  percentage: number;
  tariffIds: number[];
}
