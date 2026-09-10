export class CreateTariffDto {
  code: string;
  name: string;
  description?: string | null;
  position?: number;
}
