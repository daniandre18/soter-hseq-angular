import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { NewService, Service } from '../models/service.model';

/** Puerto de acceso al catálogo `services` (los ítems que se seleccionan
 *  al armar una cotización). */
export interface ServiceRepository {
  watchAll(): Observable<Service[]>;
  addService(data: NewService, createdBy: string): Promise<string>;
  updateService(id: string, changes: Partial<NewService>, updatedBy: string): Promise<void>;
  deleteService(id: string): Promise<void>;
}

export const SERVICE_REPOSITORY = new InjectionToken<ServiceRepository>('SERVICE_REPOSITORY');
