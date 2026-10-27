export class CreatePlatformLaboratoryDto {
  rif: string;
  name: string;
  businessName: string;
  address: string;
  phone?: string;
  email?: string;
  branchCode: string;
  branchName: string;
  administratorName: string;
  administratorUsername: string;
  administratorEmail?: string;
  administratorPassword: string;
  seedPackages?: string[];
}
