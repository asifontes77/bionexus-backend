import { BadRequestException } from '@nestjs/common';

const USER_EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export function normalizeUserEmail(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('USER_EMAIL_INVALID');
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 100 || /[\r\n\t ]/.test(normalized) || !USER_EMAIL_PATTERN.test(normalized)) {
    throw new BadRequestException('USER_EMAIL_INVALID');
  }
  return normalized;
}
