import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
  { path: 'my', redirectTo: '/p/dashboard' },
  {
    path: 'pending',
    title: 'Pending Projects',
    loadComponent: () =>
      import('./pages/pending/projects-pending-page.component').then(
        (m) => m.ProjectsPendingPageComponent,
      ),
  },
  { path: 'in-progress', redirectTo: '/p/dashboard' },
  { path: 'suspended', redirectTo: '/p/dashboard' },
  { path: 'completed', redirectTo: '/p/dashboard' },
  {
    path: ':id',
    title: 'Project Detail',
    loadComponent: () =>
      import('./pages/detail/project-detail-page.component').then(
        (m) => m.ProjectDetailPageComponent,
      ),
  },
];
