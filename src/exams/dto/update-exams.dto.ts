export class UpdateExamsDto {
  patientsId?: number;
  examlistsId?: number;
  exam_catalog_id?: number;
  date?: Date;
  group_id?: number;
  position?: number;
  amount?: number;
  price?: number;
  total?: number;
  status?: boolean;
  result?: string;
  size?: number;
  processed_id?: number | null;
  approved_id?: number | null;
  tax_description?: string;
  tax_amount?: number;
  tax_total?: number;

  email_status?: number;
  description?: string;
}
