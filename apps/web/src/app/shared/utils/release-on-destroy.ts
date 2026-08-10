import { DestroyRef, inject } from '@angular/core';
import type { ReleaseListener } from './reference-counted-listener';

/** Vincula un consumidor de datos al ciclo de vida del componente actual. */
export function releaseOnDestroy(
  release: ReleaseListener | void,
  destroyRef = inject(DestroyRef),
): void {
  if (release) {
    destroyRef.onDestroy(release);
  }
}
