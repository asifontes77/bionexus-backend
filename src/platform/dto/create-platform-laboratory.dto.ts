export class CreatePlatformLaboratoryDto {
  access_slug: string;
  rif: string;
  name: string;
  businessName: string;
  address: string;
  operational_currency_code: 'VES' | 'USD' | 'EUR';
  plan_code?: string;
  subscription_status: 'trial' | 'active' | 'perpetual_free';
  service_starts_at: string;
  service_expires_at: string | null;
  perpetual_free_reason?: string;
  commercial_notes?: string;
  phone?: string;
  email?: string;
  branchCode?: string;
  branchName: string;
  administratorName: string;
  administratorUsername: string;
  administratorEmail?: string;
  administratorPassword: string;
  administratorPasswordConfirmation: string;
  seedPackages?: string[];
}
