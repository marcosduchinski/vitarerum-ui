import { Routes } from '@angular/router';

export const PROPOSALS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/p/dashboard' },
  { path: 'new', redirectTo: '/p/dashboard' },
  { path: 'my', redirectTo: '/p/dashboard' },
  { path: 'others', redirectTo: '/p/dashboard' },
  { path: 'approved', redirectTo: '/p/dashboard' },
  { path: 'rejected', redirectTo: '/p/dashboard' },
  { path: ':id', redirectTo: '/p/dashboard' },
];
