export class CreateExamsDto {
  patientsId: number;
  examlistsId?: number;
  exam_catalog_id?: number;
  date: Date;
  group_id: number;
  position: number;
  amount: number;
  price: number;
  total: number;
  tax_description: string;
  tax_amount: number;
  tax_total: number;
  description: string;
}
