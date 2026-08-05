import { Injectable } from '@angular/core';

/** Aísla la única recarga completa usada como respaldo del acceso demo. */
@Injectable({ providedIn: 'root' })
export class BrowserReloadService {
  reload(): void {
    globalThis.location.reload();
  }
}
