export interface ExamTariffPriceInputDto {
  tariffId: number;
  price: number;
  isActive?: boolean;
}

export class ReplaceExamTariffPricesDto {
  prices: ExamTariffPriceInputDto[];
}
