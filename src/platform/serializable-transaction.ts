import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export async function runSerializableTransaction<T>(
  dataSource: DataSource,
  failureCode: string,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await dataSource.transaction('SERIALIZABLE', work);
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt === 1) throw new ConflictException(failureCode);
    }
  }
  throw new ConflictException(failureCode);
}

function isSerializationFailure(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '40001';
}
