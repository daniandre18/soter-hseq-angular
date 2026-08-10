import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AppSettings } from '../models/app-settings.model';

/**
 * Puerto de acceso al documento único `settings/general`. Los campos de
 * texto se escriben directo (sin Cloud Function): `firestore.rules` ya
 * exige `isAdmin()` para escribir esta colección, igual que `clientTags`
 * (CLAUDE.md §6.2 — no todo necesita pasar por backend, solo lo que
 * requiere Storage o el Admin SDK; ver `LogoUploadGateway` para el logo).
 */
export interface SettingsRepository {
  /** `null` mientras el documento no existe todavía (primera vez). */
  watch(): Observable<AppSettings | null>;

  update(changes: Partial<Omit<AppSettings, 'updatedAt' | 'updatedBy'>>, updatedBy: string): Promise<void>;
}

export const SETTINGS_REPOSITORY = new InjectionToken<SettingsRepository>('SETTINGS_REPOSITORY');
