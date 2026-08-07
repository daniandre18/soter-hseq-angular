import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ClientTag, NewClientTag } from '../models/client-tag.model';

/** Puerto de acceso al catálogo administrable `clientTags`. */
export interface ClientTagRepository {
  watchAll(): Observable<ClientTag[]>;
  addTag(data: NewClientTag, createdBy: string): Promise<string>;
  /** Hard delete: a diferencia de clientes/órdenes, una etiqueta no tiene
   *  "historial" propio que proteger. Los clientes que ya la tenían
   *  aplicada se quedan con ese `id` en su arreglo `tags` — la UI debe
   *  tolerar un `id` sin match (mismo criterio que borrar un servicio no
   *  rompe las cotizaciones ya creadas con él). */
  deleteTag(id: string): Promise<void>;
}

export const CLIENT_TAG_REPOSITORY = new InjectionToken<ClientTagRepository>(
  'CLIENT_TAG_REPOSITORY',
);
