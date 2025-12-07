import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },

  {
    path: 'auth',
    loadComponent: () =>
      import('./authentication/authentication.component').then((m) => m.AuthenticationComponent),
  },

  {
    path: 'auth-status',
    loadComponent: () =>
      import('./access-status/access-status').then((m) => m.AccessStatusComponent),
  },

  {
    path: 'dashboard',
    canActivate: [() => import('./dashboard.guard').then((m) => m.dashboardGuard)],
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },

  // будь-який інший шлях — на авторизацію
  {
    path: '**',
    redirectTo: 'auth',
  },
];
