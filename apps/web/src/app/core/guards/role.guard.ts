import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import type { UserRole } from '../models/user-role.model';

/**
 * Restringe una ruta a un subconjunto de roles. Igual que `authGuard`, es
 * defensa de UI: el rol real siempre se revalida en Firestore Rules/Cloud
 * Functions, nunca se confía únicamente en lo que decide el frontend.
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authFacade = inject(AuthFacade);
    const router = inject(Router);

    return authFacade.resolveCurrentUser$().pipe(
      map((user) => {
        if (!user) {
          return router.createUrlTree(['/login']);
        }
        return allowedRoles.includes(user.role) ? true : router.createUrlTree(['/acceso-denegado']);
      }),
    );
  };
}
