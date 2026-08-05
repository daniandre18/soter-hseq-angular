import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import type { AppUser } from '../models/app-user.model';
import { homeRedirectGuard } from './home-redirect.guard';

describe('homeRedirectGuard', () => {
  it('sends the Cliente/VIEWER profile to its orders', async () => {
    const viewer = { role: 'VIEWER' } as AppUser;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: { resolveCurrentUser$: () => of(viewer) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      homeRedirectGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<UrlTree>;
    const urlTree = await firstValueFrom(result);

    expect(TestBed.inject(Router).serializeUrl(urlTree)).toBe('/ordenes');
  });
});
