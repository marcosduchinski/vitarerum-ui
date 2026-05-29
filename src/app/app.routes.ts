import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'p',
    title: 'Vitarerum',
    loadComponent: () =>
      import('@layout/shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
    ],
  },
  {
    path: 'not-found',
    title: 'Not Found',
    loadComponent: () =>
      import('@features/errors/not-found.component').then((m) => m.NotFoundComponent),
  },
  { path: '**', redirectTo: 'not-found' },
];
