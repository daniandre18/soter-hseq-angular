import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { environment } from '../environments/environment';

const loadLoginComponent = environment.demoQuickLoginEnabled
  ? () => import('./features/auth/pages/demo-login/demo-login').then(({ DemoLogin }) => DemoLogin)
  : () => import('./features/auth/pages/login/login').then(({ Login }) => Login);

export const routes: Routes = [
  { path: 'login', loadComponent: loadLoginComponent, title: 'routes.login' },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then(
        ({ ForgotPassword }) => ForgotPassword,
      ),
    title: 'routes.forgotPassword',
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./shared/pages/access-denied/access-denied').then(
        ({ AccessDenied }) => AccessDenied,
      ),
    title: 'routes.accessDenied',
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(({ Shell }) => Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(({ Dashboard }) => Dashboard),
        title: 'routes.dashboard',
        data: { titleKey: 'layout.pageTitles.dashboard' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clients/pages/clients-list/clients-list').then(
            ({ ClientsList }) => ClientsList,
          ),
        title: 'routes.clients',
        data: { titleKey: 'layout.pageTitles.clients' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'cotizaciones',
        loadComponent: () =>
          import('./features/quotes/pages/quotes-list/quotes-list').then(
            ({ QuotesList }) => QuotesList,
          ),
        title: 'routes.quotes',
        data: { titleKey: 'layout.pageTitles.quotes' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'])],
      },
      {
        path: 'ordenes',
        loadComponent: () =>
          import('./features/orders/pages/orders-list/orders-list').then(
            ({ OrdersList }) => OrdersList,
          ),
        title: 'routes.orders',
        data: { titleKey: 'layout.pageTitles.orders' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'])],
      },
      {
        path: 'ordenes/:id',
        loadComponent: () =>
          import('./features/orders/pages/order-detail/order-detail').then(
            ({ OrderDetail }) => OrderDetail,
          ),
        title: 'routes.orders',
        data: { titleKey: 'layout.pageTitles.orders' },
        canActivate: [
          roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'TECHNICIAN', 'VIEWER']),
        ],
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/orders/pages/visits-agenda/visits-agenda').then(
            ({ VisitsAgenda }) => VisitsAgenda,
          ),
        title: 'routes.agenda',
        data: { titleKey: 'layout.pageTitles.agenda' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'TECHNICIAN', 'VIEWER'])],
      },
      {
        path: 'servicios/categorias',
        loadComponent: () =>
          import('./features/services/pages/service-categories/service-categories').then(
            ({ ServiceCategories }) => ServiceCategories,
          ),
        title: 'routes.categories',
        data: { titleKey: 'layout.pageTitles.categories' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL'])],
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/services/pages/services-list/services-list').then(
            ({ ServicesList }) => ServicesList,
          ),
        title: 'routes.services',
        data: { titleKey: 'layout.pageTitles.services' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/users/pages/internal-users-list/internal-users-list').then(
            ({ InternalUsersList }) => InternalUsersList,
          ),
        title: 'routes.users',
        data: { titleKey: 'layout.pageTitles.users' },
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'tecnicos',
        loadComponent: () =>
          import('./features/users/pages/technicians-list/technicians-list').then(
            ({ TechniciansList }) => TechniciansList,
          ),
        title: 'routes.technicians',
        data: { titleKey: 'layout.pageTitles.technicians' },
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/settings/pages/settings-page/settings-page').then(
            ({ SettingsPage }) => SettingsPage,
          ),
        title: 'routes.settings',
        data: { titleKey: 'layout.pageTitles.settings' },
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'mis-ordenes',
        loadComponent: () =>
          import('./features/orders/pages/my-orders/my-orders').then(
            ({ MyOrders }) => MyOrders,
          ),
        title: 'routes.myOrders',
        data: { titleKey: 'layout.pageTitles.myOrders' },
        canActivate: [roleGuard(['TECHNICIAN'])],
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found').then(({ NotFound }) => NotFound),
    title: 'routes.notFound',
  },
];
