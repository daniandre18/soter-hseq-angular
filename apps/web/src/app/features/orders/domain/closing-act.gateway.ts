import { InjectionToken } from '@angular/core';

/**
 * Puerto para las dos operaciones del acta de cierre que requieren
 * privilegios de backend: generar el borrador con IA (nunca se invoca
 * Gemini desde Angular) y generar el PDF final + cerrar la orden (escribe
 * en rutas que las Rules del cliente bloquean a propósito).
 */
export interface ClosingActGateway {
  /** Solicita al backend generar el borrador con IA y deja la orden en
   *  revisión humana (CLAUDE.md §23.6/§29: la IA nunca cierra la orden por
   *  sí sola). El store se actualiza vía el listener de `OrderRepository`,
   *  no mediante el valor de retorno. */
  generateDraft(orderId: string, notes: string): Promise<void>;

  /** Genera el PDF final y cierra la orden. Retorna la URL de descarga ya
   *  resuelta. */
  closeOrder(orderId: string, actId: string): Promise<string>;
}

export const CLOSING_ACT_GATEWAY = new InjectionToken<ClosingActGateway>('CLOSING_ACT_GATEWAY');
