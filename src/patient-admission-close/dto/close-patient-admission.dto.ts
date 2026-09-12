export interface CloseAdmissionExamDto {
  examCatalogId: number;
  quantity?: number;
}
export interface CloseAdmissionPaymentDto {
  typePaymentId: number;
  amount: number;
  currency: 'BASE' | 'LOCAL';
  description1?: string;
  description2?: string;
}
export interface CloseAdmissionPatientDto {
  profileId?: number;
  verificationCode?: string;
  documentNumber?: string;
  name: string;
  birthDate?: string;
  age: number;
  ageUnit: string;
  sex: boolean;
  phone?: string;
  email?: string;
  address?: string;
  observation?: string;
  suggested?: string;
  urgent?: boolean;
  sample: string;
  sampleType?: string;
  emailResults?: boolean;
}
export class ClosePatientAdmissionDto {
  clientId: number;
  tariffId: number;
  patient: CloseAdmissionPatientDto;
  exams: CloseAdmissionExamDto[];
  payments: CloseAdmissionPaymentDto[];
}
