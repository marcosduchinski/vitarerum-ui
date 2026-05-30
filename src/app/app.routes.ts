import { Routes } from '@angular/router';
import { authGuard } from '@core/identity/auth.guard';
import { unauthenticatedGuard } from '@core/identity/unauthenticated.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Login',
    canActivate: [unauthenticatedGuard],
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'p',
    title: 'Vitarerum',
    canActivate: [authGuard],
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

      // Proposal routes — feature screens added per plan task order
      {
        path: 'proposals',
        children: [
          { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
          { path: 'new', redirectTo: '/p/dashboard' },
          { path: 'my', redirectTo: '/p/dashboard' },
          { path: 'queue', redirectTo: '/p/dashboard' },
          { path: 'assignments', redirectTo: '/p/dashboard' },
          { path: 'pending-documents', redirectTo: '/p/dashboard' },
          { path: 'pending-direction', redirectTo: '/p/dashboard' },
          { path: 'approved', redirectTo: '/p/dashboard' },
          { path: 'rejected', redirectTo: '/p/dashboard' },
          { path: ':id', redirectTo: '/p/dashboard' },
        ],
      },

      // Project routes — feature screens added per plan task order
      {
        path: 'projects',
        children: [
          { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
          { path: 'my', redirectTo: '/p/dashboard' },
          { path: 'all', redirectTo: '/p/dashboard' },
          { path: 'pending', redirectTo: '/p/dashboard' },
          { path: 'in-progress', redirectTo: '/p/dashboard' },
          { path: 'suspended', redirectTo: '/p/dashboard' },
          { path: 'completed', redirectTo: '/p/dashboard' },
          { path: ':id', redirectTo: '/p/dashboard' },
        ],
      },

      // Admin routes
      {
        path: 'admin',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          {
            path: 'users',
            title: 'Users',
            loadComponent: () =>
              import('@features/admin/users/users-page.component').then(m => m.UsersPageComponent),
          },
          {
            path: 'users/:id',
            title: 'User',
            loadComponent: () =>
              import('@features/admin/users/user-detail.component').then(m => m.UserDetailComponent),
          },
          { path: 'groups', redirectTo: '/p/dashboard' },
        ],
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
