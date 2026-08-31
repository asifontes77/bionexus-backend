import { LaboratoryEmailSettingsDto } from './test-laboratory-email.dto';

export class UpdateLaboratoryDto {
  name?: string;
  business_name?: string;
  address?: string;
  rif?: string;
  phone_1?: string;
  phone_2?: string;
  email?: string;
  logo?: string;
  print_invoice?: boolean;
  print_sample_take?: boolean;
  url?: string;
  invoice_number?: number;
  creditnote_number?: number;
  voucher_number?: number;
  mask_phone?: string;
  voucher_format?: string;
  rows_description_invoices?: number;
  max_height_logo?: number;
  max_width_logo?: number;
  settingQR?: JSON;
  sendEmail?: LaboratoryEmailSettingsDto;
  head_html?: string;
  body_html?: string;
  page_html?: string;
  maximum_rows_report?: number;
  workshee_format?: string;
  printer_type?: string;
  printer_interface?: string;
  license?: string;
  receipt_format?: string;
  rows_description_receipt?: number;
  receipt_number?: number;
  print_receipt?: boolean;
}
