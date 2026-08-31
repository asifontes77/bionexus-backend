export type LaboratoryEmailSettingsDto = {
  isGmail?: boolean;
  host?: string;
  port?: number | null;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
};

export type CompleteLaboratoryEmailSettings = Required<Pick<LaboratoryEmailSettingsDto, 'isGmail' | 'user' | 'from'>> & LaboratoryEmailSettingsDto;

export class TestLaboratoryEmailDto {
  sendEmail: LaboratoryEmailSettingsDto;
}
