import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthFacade } from '../../auth/facades/auth.facade';
import { SETTINGS_REPOSITORY } from '../../../core/repositories/settings.repository';
import { LOGO_UPLOAD_GATEWAY } from '../domain/logo-upload.gateway';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../../../core/models/app-settings.model';
import {
  ReferenceCountedListener,
  type ReleaseListener,
} from '../../../shared/utils/reference-counted-listener';

type GeneralInfo = Pick<AppSettings, 'businessName' | 'tagline' | 'email' | 'phone' | 'address'>;
type AppearanceInfo = Pick<AppSettings, 'logoDesktopSize' | 'logoMobileSize' | 'logoAlignment'>;

/**
 * Único punto de acceso a `settings/general`. `providedIn: 'root'` a
 * propósito: tanto el sidebar (lectura, todos los roles) como la página de
 * Configuración (lectura + escritura, solo ADMIN) comparten la misma
 * instancia y el mismo listener de Firestore — `init()` es idempotente.
 */
@Injectable({ providedIn: 'root' })
export class SettingsFacade {
  private readonly repository = inject(SETTINGS_REPOSITORY);
  private readonly logoGateway = inject(LOGO_UPLOAD_GATEWAY);
  private readonly authFacade = inject(AuthFacade);

  private readonly listener = new ReferenceCountedListener();
  private readonly loadedSettings = signal<AppSettings | null>(null);
  private readonly loadingSignal = signal(true);
  private readonly errorSignal = signal<string | null>(null);

  /** Siempre un `AppSettings` completo (nunca `null`): mientras carga o si
   *  el documento todavía no existe, cae a `DEFAULT_APP_SETTINGS` para que
   *  ningún consumidor (sidebar incluido) tenga que manejar el caso nulo. */
  readonly settings = computed<AppSettings>(
    () => this.loadedSettings() ?? { ...DEFAULT_APP_SETTINGS, updatedAt: new Date(0), updatedBy: '' },
  );
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  init(): ReleaseListener {
    return this.listener.acquire(() => {
      this.loadingSignal.set(true);
      return this.repository.watch().subscribe({
        next: (settings) => {
          this.loadedSettings.set(settings);
          this.errorSignal.set(null);
          this.loadingSignal.set(false);
        },
        error: (error: Error) => {
          this.errorSignal.set(error.message);
          this.loadingSignal.set(false);
          this.listener.markDisconnected();
        },
      });
    });
  }

  async updateGeneral(changes: GeneralInfo): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.repository.update(changes, userId);
  }

  async updateAppearance(changes: Partial<AppearanceInfo>): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.repository.update(changes, userId);
  }

  /** El logo se sube por Cloud Function, que ya actualiza `logoUrl` en
   *  Firestore — no hace falta un segundo `update()` acá, el listener de
   *  `init()` recibe el cambio solo. */
  async uploadLogo(file: File, onProgress?: (percent: number) => void): Promise<void> {
    await this.logoGateway.upload({ file, onProgress });
  }
}
