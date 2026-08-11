import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { filter } from 'rxjs';
import { ToastService } from './toast.service';

/** Cada cuánto reintentar la comprobación de versión mientras la pestaña
 *  sigue abierta — el Service Worker no hace polling propio; sin esto, una
 *  sesión larga (una PWA instalada, dejada abierta todo el día) nunca se
 *  entera de un deploy nuevo hasta el próximo cierre/apertura manual. */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.promptReload());

    setInterval(() => void this.swUpdate.checkForUpdate(), CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.swUpdate.checkForUpdate();
      }
    });
  }

  private promptReload(): void {
    this.toast.action(this.transloco.translate('common.appUpdate.message'), {
      label: this.transloco.translate('common.appUpdate.reload'),
      onClick: () => document.location.reload(),
    });
  }
}
