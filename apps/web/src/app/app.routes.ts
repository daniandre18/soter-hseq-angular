import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { Shell } from './layout/shell/shell';
import { Login } from './features/auth/pages/login/login';
import { DemoLogin } from './features/auth/pages/demo-login/demo-login';
import { ForgotPassword } from './features/auth/pages/forgot-password/forgot-password';
import { AccessDenied } from './shared/pages/access-denied/access-denied';
import { NotFound } from './shared/pages/not-found/not-found';
import { Dashboard } from './features/dashboard/dashboard';
import { ClientsList } from './features/clients/pages/clients-list/clients-list';
import { QuotesList } from './features/quotes/pages/quotes-list/quotes-list';
import { OrdersList } from './features/orders/pages/orders-list/orders-list';
import { OrderDetail } from './features/orders/pages/order-detail/order-detail';
import { MyOrders } from './features/orders/pages/my-orders/my-orders';
import { VisitsAgenda } from './features/orders/pages/visits-agenda/visits-agenda';
import { ServicesList } from './features/services/pages/services-list/services-list';
import { ServiceCategories } from './features/services/pages/service-categories/service-categories';
import { TechniciansList } from './features/users/pages/technicians-list/technicians-list';
import { SettingsPage } from './features/settings/pages/settings-page/settings-page';
import { environment } from '../environments/environment';

const loginComponent = environment.demoQuickLoginEnabled ? DemoLogin : Login;

export const routes: Routes = [
  { path: 'login', component: loginComponent, title: 'routes.login' },
  {
    path: 'recuperar-contrasena',
    component: ForgotPassword,
    title: 'routes.forgotPassword',
  },
  { path: 'acceso-denegado', component: AccessDenied, title: 'routes.accessDenied' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'dashboard',
        component: Dashboard,
        title: 'routes.dashboard',
        data: { titleKey: 'layout.pageTitles.dashboard' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'clientes',
        component: ClientsList,
        title: 'routes.clients',
        data: { titleKey: 'layout.pageTitles.clients' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'cotizaciones',
        component: QuotesList,
        title: 'routes.quotes',
        data: { titleKey: 'layout.pageTitles.quotes' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'])],
      },
      {
        path: 'ordenes',
        component: OrdersList,
        title: 'routes.orders',
        data: { titleKey: 'layout.pageTitles.orders' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'])],
      },
      {
        path: 'ordenes/:id',
        component: OrderDetail,
        title: 'routes.orders',
        data: { titleKey: 'layout.pageTitles.orders' },
        canActivate: [
          roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'TECHNICIAN', 'VIEWER']),
        ],
      },
      {
        path: 'agenda',
        component: VisitsAgenda,
        title: 'routes.agenda',
        data: { titleKey: 'layout.pageTitles.agenda' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'TECHNICIAN', 'VIEWER'])],
      },
      {
        path: 'servicios/categorias',
        component: ServiceCategories,
        title: 'routes.categories',
        data: { titleKey: 'layout.pageTitles.categories' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL'])],
      },
      {
        path: 'servicios',
        component: ServicesList,
        title: 'routes.services',
        data: { titleKey: 'layout.pageTitles.services' },
        canActivate: [roleGuard(['ADMIN', 'COMMERCIAL', 'COORDINATOR'])],
      },
      {
        path: 'tecnicos',
        component: TechniciansList,
        title: 'routes.technicians',
        data: { titleKey: 'layout.pageTitles.technicians' },
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'configuracion',
        component: SettingsPage,
        title: 'routes.settings',
        data: { titleKey: 'layout.pageTitles.settings' },
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'mis-ordenes',
        component: MyOrders,
        title: 'routes.myOrders',
        data: { titleKey: 'layout.pageTitles.myOrders' },
        canActivate: [roleGuard(['TECHNICIAN'])],
      },
    ],
  },
  { path: '**', component: NotFound, title: 'routes.notFound' },
];
