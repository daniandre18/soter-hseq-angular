import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Shell } from './layout/shell/shell';
import { Login } from './features/auth/pages/login/login';
import { ForgotPassword } from './features/auth/pages/forgot-password/forgot-password';
import { AccessDenied } from './shared/pages/access-denied/access-denied';
import { NotFound } from './shared/pages/not-found/not-found';
import { Dashboard } from './features/dashboard/dashboard';
import { ClientsList } from './features/clients/pages/clients-list/clients-list';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Iniciar sesión — SOTER HSEQ' },
  {
    path: 'recuperar-contrasena',
    component: ForgotPassword,
    title: 'Recuperar contraseña — SOTER HSEQ',
  },
  { path: 'acceso-denegado', component: AccessDenied, title: 'Acceso denegado — SOTER HSEQ' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        component: Dashboard,
        title: 'Panel — SOTER HSEQ',
        data: { title: 'Panel' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'clientes',
        component: ClientsList,
        title: 'Clientes — SOTER HSEQ',
        data: { title: 'Clientes' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
    ],
  },
  { path: '**', component: NotFound, title: 'Página no encontrada — SOTER HSEQ' },
];
