import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './_core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        title: 'Sign in · open-crm',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'signup',
        title: 'Create an account · open-crm',
        loadComponent: () => import('./features/auth/signup/signup').then((m) => m.Signup),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./_shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · open-crm',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
