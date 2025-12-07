import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },

  {
    path: 'auth',
    canActivate: [() => import('./pending.guard').then((m) => m.pendingGuard)],
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
    canActivate: [
      () => import('./pending.guard').then((m) => m.pendingGuard),
      () => import('./dashboard.guard').then((m) => m.dashboardGuard),
    ],
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },

  // будь-який інший шлях — на авторизацію
  {
    path: '**',
    redirectTo: 'auth',
  },
];
