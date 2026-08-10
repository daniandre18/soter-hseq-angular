import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'semi-dark' | 'system';
export type EffectiveTheme = 'light' | 'dark' | 'semi-dark';

const THEME_STORAGE_KEY = 'app_theme';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'semi-dark' || value === 'system';
}

/**
 * Controla el tema de toda la app vía el atributo `data-theme` en `<html>`.
 * `styles.scss` lee ese atributo para dos cosas independientes:
 *  - Los tokens de contenido (`--color-gray-*`, `--color-surface`): solo se
 *    oscurecen con `dark` (o `system` + SO oscuro).
 *  - Los tokens del sidebar (`--sidebar-*`): se oscurecen con `dark` Y con
 *    `semi-dark` — ese es justamente el propósito de "Semi Dark": menú
 *    lateral oscuro con el contenido principal claro.
 * "system" borra el atributo y deja que `prefers-color-scheme` decida (ver
 * el script anti-FOUC en `index.html`); nunca resuelve a "semi-dark", que
 * es una elección manual explícita (igual que en Vuexy/plantillas admin).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  readonly preference = signal<ThemePreference>(this.readStoredPreference());
  private readonly systemIsDark = signal(this.systemPrefersDark.matches);

  readonly effectiveTheme = computed<EffectiveTheme>(() => {
    const preference = this.preference();
    if (preference === 'system') {
      return this.systemIsDark() ? 'dark' : 'light';
    }
    return preference;
  });

  constructor() {
    this.systemPrefersDark.addEventListener('change', (event) => {
      this.systemIsDark.set(event.matches);
    });

    effect(() => {
      const preference = this.preference();
      if (preference === 'system') {
        this.document.documentElement.removeAttribute('data-theme');
      } else {
        this.document.documentElement.dataset['theme'] = preference;
      }
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      if (preference === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) — el tema sigue
      // aplicado en memoria para esta sesión, solo no persiste.
    }
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return isThemePreference(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
