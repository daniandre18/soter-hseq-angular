import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { filter, firstValueFrom } from 'rxjs';
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from './language.config';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  readonly currentLanguage = signal<AppLanguage>(DEFAULT_LANGUAGE);
  readonly currentLocale = computed(
    () =>
      SUPPORTED_LANGUAGES.find((language) => language.code === this.currentLanguage())?.locale ??
      'es-CO',
  );

  /**
   * Se incrementa cada vez que termina de cargar un scope de Transloco.
   * `TranslocoService.translate()` es una llamada síncrona sin integración
   * con Signals: un `computed()` que lo invoca directamente (p. ej. para
   * armar labels de un chart) no se reevalúa cuando ese scope todavía no
   * había cargado en el momento del cambio de idioma. Leer esta señal como
   * dependencia adicional en ese `computed()` fuerza la reevaluación cuando
   * el scope finalmente carga, sin duplicar esta suscripción en cada feature.
   *
   * Se actualiza en un microtask (no con `toSignal`) porque `events$` puede
   * emitir de forma síncrona mientras Angular está renderizando una plantilla
   * en otro punto de la app; escribir la señal en ese momento dispara NG0600
   * ("Writing to signals is not allowed while Angular renders the template").
   */
  private readonly translationsLoadedTick = signal(0);
  readonly translationsLoaded = this.translationsLoadedTick.asReadonly();

  constructor() {
    this.transloco.events$
      .pipe(filter((event) => event.type === 'translationLoadSuccess'))
      .subscribe(() => {
        queueMicrotask(() => this.translationsLoadedTick.update((tick) => tick + 1));
      });
  }

  initializeLanguage(): Promise<void> {
    const storedLanguage = this.readStoredLanguage();
    this.applyLanguage(storedLanguage, false);
    return firstValueFrom(this.transloco.load(storedLanguage))
      .then(() => undefined)
      .catch(() => undefined);
  }

  changeLanguage(language: AppLanguage): void {
    if (!this.isSupportedLanguage(language)) {
      return;
    }
    this.applyLanguage(language, true);
  }

  isSupportedLanguage(language: unknown): language is AppLanguage {
    return isAppLanguage(language);
  }

  private readStoredLanguage(): AppLanguage {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  private applyLanguage(language: AppLanguage, persist: boolean): void {
    this.currentLanguage.set(language);
    this.transloco.setActiveLang(language);
    this.document.documentElement.lang = language;

    if (persist) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // La preferencia sigue activa durante la sesión si el navegador
        // bloquea localStorage (modo privado o políticas corporativas).
      }
    }
  }
}
