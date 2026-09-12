import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
export type AdmissionCloseWork<T> = (manager: EntityManager) => Promise<T>;
@Injectable()
export class PatientAdmissionCloseTransaction {
  constructor(private readonly dataSource: DataSource) {}
  execute<T>(work: AdmissionCloseWork<T>): Promise<T> {
    if (typeof work !== 'function') throw new Error('PATIENT_ADMISSION_CLOSE_WORK_REQUIRED');
    return this.dataSource.transaction('SERIALIZABLE', work);
  }
}
