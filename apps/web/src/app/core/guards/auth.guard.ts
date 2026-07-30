import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from '../../features/auth/facades/auth.facade';

/**
 * Bloquea rutas privadas para usuarios sin sesión. La decisión final de
 * permisos siempre se valida también en Firestore Rules / Cloud Functions
 * (CLAUDE.md §13.2): este guard es solo la primera línea de defensa en UI.
 */
export const authGuard: CanActivateFn = () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return authFacade
    .resolveCurrentUser$()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/login']))));
};
