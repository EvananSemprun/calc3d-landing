import { describe, expect, it } from 'vitest';
import { escapeAttr, escapeHtml } from './escape';

describe('escapeHtml', () => {
  it("neutraliza < > & \" '", () => {
    expect(escapeHtml('<b>"x"&\'y\'')).toBe('&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;');
  });

  it('tolera null y undefined (devuelve cadena vacía)', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('convierte números a texto', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('escapeAttr', () => {
  it('escapa igual que escapeHtml (comillas incluidas)', () => {
    expect(escapeAttr('a"b\'c<d')).toBe('a&quot;b&#39;c&lt;d');
  });
});
