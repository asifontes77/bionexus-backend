export class UpdateInvoiceDto {
  date?: Date;
  id_patients?: number;
  document_type?: string;
  business_name?: string;
  rif?: string;
  addres?: string;
  id_users?: number;
  id_client?: number;
  subtotal?: number;
  discount?: number;
  discount_total?: number;
  iva?: number;
  iva_total?: number;
  tax_base?: number;
  deleted?: boolean;
  paying?: boolean;
  total?: number;
  foot_payments?: string;
}
