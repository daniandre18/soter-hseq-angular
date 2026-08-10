export type LogoAlignment = 'left' | 'center' | 'right';

/**
 * Documento único `settings/general` — parámetros básicos configurables por
 * un ADMIN (CLAUDE.md §3.1 "Configurar parámetros básicos"). Se lee en toda
 * la app (p. ej. el logo del sidebar), por eso vive en `core/models` y no
 * dentro de `features/settings`.
 */
export interface AppSettings {
  businessName: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  /** Alto del logo en px — 30 a 200, ver `LOGO_SIZE_RANGE`. */
  logoDesktopSize: number;
  logoMobileSize: number;
  logoAlignment: LogoAlignment;
  updatedAt: Date;
  updatedBy: string;
}

export const LOGO_SIZE_RANGE = { min: 30, max: 200 } as const;

export const DEFAULT_APP_SETTINGS: Omit<AppSettings, 'updatedAt' | 'updatedBy'> = {
  businessName: 'SOTER HSEQ',
  tagline: 'Salud y Seguridad en el Trabajo',
  logoDesktopSize: 44,
  logoMobileSize: 36,
  logoAlignment: 'left',
};
