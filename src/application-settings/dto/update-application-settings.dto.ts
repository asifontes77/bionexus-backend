export class UpdateApplicationSettingsDto {
  session_timeout_minutes?: number;
  inactivity_timeout_minutes?: number;
  countdown_seconds?: number;
  voucher_format?: string;
  receipt_format?: string;
  head_html?: string;
  body_html?: string;
  page_html?: string;
  maximum_rows_report?: number;
  workshee_format?: string;
  printer_type?: string;
  printer_interface?: string;
}