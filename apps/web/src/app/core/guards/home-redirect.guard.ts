import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from '../../features/auth/facades/auth.facade';

/**
 * La ruta "de inicio" no es la misma para todos los roles: un técnico no
 * tiene acceso al Panel (CLAUDE.md §3.2), así que en vez de un
 * `redirectTo` fijo, cada usuario aterriza en la primera pantalla que su
 * rol sí puede ver.
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return authFacade.resolveCurrentUser$().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      const destination =
        user.role === 'TECHNICIAN'
          ? '/mis-ordenes'
          : user.role === 'VIEWER'
            ? '/ordenes'
            : '/dashboard';
      return router.createUrlTree([destination]);
    }),
  );
};
