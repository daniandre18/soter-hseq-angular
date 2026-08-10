import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DashboardSnapshot } from '../models/dashboard-snapshot.model';

/** Puerto de lectura optimizada para los datos sintéticos del dashboard. */
export interface DashboardRepository {
  watchSnapshot(): Observable<DashboardSnapshot>;
  loadSnapshot(now: Date): Promise<DashboardSnapshot>;
}

export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DASHBOARD_REPOSITORY');
