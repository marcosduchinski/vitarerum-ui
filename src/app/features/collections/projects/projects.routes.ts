import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
  {
    path: 'my',
    title: 'My Projects',
    loadComponent: () =>
      import('./pages/my/projects-my-page.component').then((m) => m.ProjectsMyPageComponent),
  },
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
    path: ':id/log/research',
    title: 'Research Log',
    loadComponent: () =>
      import('./pages/log/project-research-log-page.component').then(
        (m) => m.ProjectResearchLogPageComponent,
      ),
  },
  {
    path: ':id/log/exhibition',
    title: 'Exhibition Log',
    loadComponent: () =>
      import('./pages/log/project-exhibition-log-page.component').then(
        (m) => m.ProjectExhibitionLogPageComponent,
      ),
  },
  {
    path: ':id/log/other',
    title: 'Project Log',
    loadComponent: () =>
      import('./pages/log/project-other-log-page.component').then(
        (m) => m.ProjectOtherLogPageComponent,
      ),
  },
  {
    path: ':id',
    title: 'Project Detail',
    loadComponent: () =>
      import('./pages/detail/project-detail-page.component').then(
        (m) => m.ProjectDetailPageComponent,
      ),
  },
];
