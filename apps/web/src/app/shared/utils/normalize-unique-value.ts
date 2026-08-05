/** Normaliza nombres para comparaciones de unicidad tolerantes a mayúsculas,
 * tildes y espacios accidentales. El valor visible original se conserva. */
export function normalizeUniqueName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

/** Un NIT es único independientemente de puntos, espacios y guion de
 * verificación. Se conservan letras por compatibilidad con otros países. */
export function normalizeTaxId(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}
