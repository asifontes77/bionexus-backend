export class UpdateApplicationSettingsDto {
  session_timeout_minutes?: number;
  inactivity_timeout_minutes?: number;
  countdown_seconds?: number;
  locale?: string;
  time_zone?: string;
  date_format?: string;
  hour_cycle?: string;
  financial_primary_currency_id?: number;
  first_day_of_week?: string;
  decimal_separator?: string;
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
