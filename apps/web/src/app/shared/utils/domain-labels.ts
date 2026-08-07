/**
 * Adaptador temporal para datos históricos ya persistidos como frases en
 * español. Los datos nuevos deben guardar códigos/variables y traducirse en
 * presentación con Transloco; no se migran documentos existentes de Firebase.
 * Las claves repetidas entre catálogos (`DRAFT`/`APPROVED`, `FINDING`) ya
 * comparten la misma traducción en ambos, así que combinarlas es seguro.
 */
const DOMAIN_CODE_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', SCHEDULED: 'Programada', ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En ejecución', EVIDENCE_PENDING: 'Evidencia pendiente',
  UNDER_REVIEW: 'En revisión', CORRECTION_REQUIRED: 'Corrección requerida',
  APPROVED: 'Aprobada', CLOSED: 'Cerrada', CANCELLED: 'Cancelada',
  SENT: 'Enviada', REJECTED: 'Rechazada', EXPIRED: 'Vencida', CONVERTED: 'Convertida',
  GENERAL: 'General', INTERNAL: 'Interna', FINDING: 'Hallazgo', RECOMMENDATION: 'Recomendación',
  BEFORE: 'Antes', DURING: 'Durante', AFTER: 'Después', DOCUMENT: 'Documento', OTHER: 'Otra',
};

/**
 * Reemplaza códigos de dominio en mayúsculas (`SCHEDULED`, `GENERAL`, ...)
 * embebidos en texto generado por Cloud Functions (`functions/src/index.ts`,
 * que no tiene acceso a estos catálogos en español) por su etiqueta en
 * español. Cualquier token que no esté en el diccionario se deja intacto —
 * es una sustitución segura, no una traducción exhaustiva del texto.
 */
export function translateDomainCodes(text: string): string {
  return text.replace(/\b[A-Z][A-Z_]{2,}\b/g, (token) => DOMAIN_CODE_LABELS[token] ?? token);
}
