import { translateDomainCodes } from './domain-labels';

describe('translateDomainCodes', () => {
  it('translates order status codes embedded in a sentence', () => {
    expect(translateDomainCodes('Estado cambiado de SCHEDULED a ASSIGNED')).toBe(
      'Estado cambiado de Programada a Asignada',
    );
  });

  it('translates quote status codes', () => {
    expect(translateDomainCodes('Estado cambiado de SENT a APPROVED')).toBe(
      'Estado cambiado de Enviada a Aprobada',
    );
  });

  it('translates note types and evidence categories', () => {
    expect(translateDomainCodes('nota tipo GENERAL')).toBe('nota tipo General');
    expect(translateDomainCodes('categoría FINDING')).toBe('categoría Hallazgo');
  });

  it('leaves unknown all-caps tokens and order numbers untouched', () => {
    expect(translateDomainCodes('Orden OT-0018 actualizada')).toBe('Orden OT-0018 actualizada');
    expect(translateDomainCodes('COT-0009 convertida')).toBe('COT-0009 convertida');
  });

  it('leaves plain lowercase/mixed-case text untouched', () => {
    expect(translateDomainCodes('Alimentos La Sabana — nota tipo GENERAL')).toBe(
      'Alimentos La Sabana — nota tipo General',
    );
  });
});
