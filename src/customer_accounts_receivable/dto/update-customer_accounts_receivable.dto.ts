export class UpdateCustomerAccountsReceivableDto {
  client_id?: number;
  invoice?: string;
  total?: number;
  total_dollars?: number;
  total_canceled?: number;
  user_id_canceled?: number;
  date_canceled?: Date;
}
