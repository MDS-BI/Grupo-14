import { describe, it, expect } from 'vitest';
import { cleanRut, formatRut, rutVerificador, validateRut } from '../../src/rut.js';

describe('utilidad de RUT chileno', () => {
  it('limpia y formatea el RUT con puntos y guion', () => {
    expect(cleanRut('12.345.678-5')).toBe('123456785');
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('96854120K')).toBe('96.854.120-K');
    expect(formatRut('')).toBe('');
  });

  it('calcula el digito verificador con modulo 11', () => {
    expect(rutVerificador('12345678')).toBe('5');
    expect(rutVerificador('96854120')).toBe('K');
    expect(rutVerificador('11111111')).toBe('1');
  });

  it('valida el digito verificador con y sin formato', () => {
    expect(validateRut('12.345.678-5')).toBe(true);
    expect(validateRut('123456785')).toBe(true);
    expect(validateRut('12.345.678-9')).toBe(false);
    expect(validateRut('12345-6')).toBe(false);
    expect(validateRut('')).toBe(false);
  });
});
