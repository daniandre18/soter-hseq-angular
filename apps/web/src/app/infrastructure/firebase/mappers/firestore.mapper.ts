import type { Timestamp } from 'firebase/firestore';

/** Convierte un `Timestamp` de Firestore a `Date`, con fallback cuando el
 *  campo es opcional y aún no se ha escrito (p. ej. `reviewedAt` antes de
 *  revisar un acta). Único punto de conversión Timestamp→Date del proyecto:
 *  antes existían copias ligeramente distintas de este helper en cada
 *  `*.service.ts` (algunas devolvían `Date`, otras `Date | undefined`). */
export function toDate(value: Timestamp | undefined | null): Date | undefined {
  return value ? value.toDate() : undefined;
}

/** Variante para campos obligatorios (p. ej. `createdAt`) que en teoría
 *  siempre trae el servidor, pero puede faltar en una lectura optimista
 *  justo después de un `serverTimestamp()` sin confirmar todavía. */
export function toDateOrDefault(value: Timestamp | undefined | null): Date {
  return value ? value.toDate() : new Date(0);
}
