import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: Dashboard },
];
