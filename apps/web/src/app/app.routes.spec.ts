import type { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

function privateRoutes(): Route[] {
  return routes.find((route) => route.path === '')?.children ?? [];
}

describe('application routes', () => {
  it('lazy loads every routed page', () => {
    const publicPages = routes.filter((route) => route.path !== '');
    const protectedPages = privateRoutes().filter((route) => route.path !== '');

    expect(routes.find((route) => route.path === '')?.loadComponent).toBeTypeOf('function');
    expect([...publicPages, ...protectedPages].every((route) => route.loadComponent)).toBe(true);
  });

  it('preserves the empty protected redirect route', () => {
    const redirectRoute = privateRoutes().find((route) => route.path === '');

    expect(redirectRoute?.pathMatch).toBe('full');
    expect(redirectRoute?.canActivate).toHaveLength(1);
  });
});
