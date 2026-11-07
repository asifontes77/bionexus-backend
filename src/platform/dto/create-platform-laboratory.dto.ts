export class CreatePlatformLaboratoryDto {
  access_slug: string;
  rif: string;
  name: string;
  businessName: string;
  address: string;
  operational_currency_code: 'VES' | 'USD' | 'EUR';
  plan_code?: string;
  service_starts_at: string;
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
