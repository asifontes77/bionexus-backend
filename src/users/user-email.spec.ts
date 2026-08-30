import { BadRequestException } from '@nestjs/common';
import { normalizeUserEmail } from './user-email';

describe('normalizeUserEmail', () => {
  it.each([
    [' Usuario@Example.COM ', 'usuario@example.com'],
    ['nombre.apellido+tag@sub.example.com', 'nombre.apellido+tag@sub.example.com'],
  ])('normaliza %s', (input, expected) => expect(normalizeUserEmail(input)).toBe(expected));

  it.each([undefined, null, '', 'sin-arroba', 'a@b', 'a b@example.com', 'a@-example.com', 'a@example..com', 'a'.repeat(90) + '@example.com'])('rechaza %s', (input) => {
    expect(() => normalizeUserEmail(input)).toThrow(BadRequestException);
  });
});
