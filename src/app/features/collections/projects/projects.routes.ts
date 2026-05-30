import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
  { path: 'my', redirectTo: '/p/dashboard' },
  { path: 'in-progress', redirectTo: '/p/dashboard' },
  { path: 'suspended', redirectTo: '/p/dashboard' },
  { path: 'completed', redirectTo: '/p/dashboard' },
  { path: ':id', redirectTo: '/p/dashboard' },
];
