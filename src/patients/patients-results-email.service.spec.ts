jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

jest.mock('node-thermal-printer', () => ({
  ThermalPrinter: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Patient } from './patients.entity';
import { PatientsService } from './patients.service';

describe('PatientsService results email candidates', () => {
  const getMany = jest.fn();
  const queryBuilder = {
    innerJoin: jest.fn(), select: jest.fn(), where: jest.fn(), andWhere: jest.fn(),
    distinct: jest.fn(), orderBy: jest.fn(), addOrderBy: jest.fn(), getMany,
  };
  Object.values(queryBuilder).forEach((value) => {
    if (value !== getMany && typeof value === 'function') value.mockReturnValue(queryBuilder);
  });
  const repository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as unknown as Repository<Patient>;
  const service = new PatientsService(repository, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza rangos invalidos', async () => {
    await expect(service.getPatientResultsEmailCandidates('31-08-2026', '2026-08-31')).rejects.toThrow(
      new BadRequestException('PATIENT_RESULTS_EMAIL_DATE_RANGE_INVALID'),
    );
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rechaza rangos mayores a 31 dias', async () => {
    await expect(service.getPatientResultsEmailCandidates('2026-07-01', '2026-08-31')).rejects.toThrow(
      new BadRequestException('PATIENT_RESULTS_EMAIL_DATE_RANGE_TOO_LARGE'),
    );
  });
  it('consulta solo pacientes habilitados con resultados aprobados y correo', async () => {
    getMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.getPatientResultsEmailCandidates('2026-08-01', '2026-08-31')).resolves.toEqual([{ id: 1 }]);
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('patient');
    expect(queryBuilder.where).toHaveBeenCalledWith('patient.admission_date BETWEEN :dateFrom AND :dateTo', { dateFrom: '2026-08-01', dateTo: '2026-08-31' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('patient.email_sent = 1');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('exam.approved_id > 0');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith("TRIM(COALESCE(patient.email, '')) <> ''");
    expect(queryBuilder.distinct).toHaveBeenCalledWith(true);
  });
});
