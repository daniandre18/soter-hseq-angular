import { ORDER_STATUS_CONFIG } from '../../features/orders/models/order-status-config';
import { NOTE_TYPE_LABELS } from '../../features/orders/models/note.model';
import { EVIDENCE_CATEGORY_LABELS } from '../../features/orders/models/evidence.model';
import { QUOTE_STATUS_CONFIG } from '../../features/quotes/models/quote-status-config';

/**
 * Un solo diccionario código→etiqueta en español, combinando los catálogos
 * que ya existen por dominio (`ORDER_STATUS_CONFIG`, `QUOTE_STATUS_CONFIG`,
 * `NOTE_TYPE_LABELS`, `EVIDENCE_CATEGORY_LABELS`) — no los duplica, solo los
 * junta para poder traducir texto ya armado (notificaciones, bitácora de
 * auditoría) sin tener que reescribir cada tipo de evento por separado.
 * Las claves repetidas entre catálogos (`DRAFT`/`APPROVED`, `FINDING`) ya
 * comparten la misma traducción en ambos, así que combinarlas es seguro.
 */
const DOMAIN_CODE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ORDER_STATUS_CONFIG).map(([code, config]) => [code, config.label]),
  ),
  ...Object.fromEntries(
    Object.entries(QUOTE_STATUS_CONFIG).map(([code, config]) => [code, config.label]),
  ),
  ...NOTE_TYPE_LABELS,
  ...EVIDENCE_CATEGORY_LABELS,
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
