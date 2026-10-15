import { describe, expect, it } from 'vitest';
import { telefonoInternacional, urlWhatsapp } from './telefono';

describe('telefonoInternacional', () => {
  it('reemplaza el 0 inicial de Venezuela por el código de país 58', () => {
    expect(telefonoInternacional('0412 1234567')).toBe('584121234567');
  });
  it('quita separadores y símbolos', () => {
    expect(telefonoInternacional('+58 (412) 123-4567')).toBe('584121234567');
  });
  it('deja un número ya internacional como está (sin 0 inicial)', () => {
    expect(telefonoInternacional('584121234567')).toBe('584121234567');
  });
  it('cadena vacía o nula → vacío', () => {
    expect(telefonoInternacional('')).toBe('');
    expect(telefonoInternacional(null)).toBe('');
    expect(telefonoInternacional(undefined)).toBe('');
  });
});

describe('urlWhatsapp', () => {
  it('normaliza el teléfono y codifica el mensaje', () => {
    const url = urlWhatsapp('04121234567', 'Hola, qué tal');
    expect(url).toBe('https://wa.me/584121234567?text=Hola%2C%20qu%C3%A9%20tal');
  });
});
